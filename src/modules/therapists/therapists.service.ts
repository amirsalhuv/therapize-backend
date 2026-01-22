import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreateTherapistProfileDto } from './dto';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [therapists, total] = await Promise.all([
      this.prisma.therapistProfile.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.therapistProfile.count(),
    ]);

    return { therapists, total, page, limit };
  }

  async findOne(id: string) {
    const therapist = await this.prisma.therapistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true } },
        _count: { select: { programEpisodes: true } },
      },
    });

    if (!therapist) throw new NotFoundException('Therapist not found');
    return therapist;
  }

  async findByUserId(userId: string) {
    const therapist = await this.prisma.therapistProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    if (!therapist) throw new NotFoundException('Therapist profile not found');
    return therapist;
  }

  async create(userId: string, dto: CreateTherapistProfileDto) {
    return this.prisma.therapistProfile.create({
      data: { userId, ...dto },
    });
  }

  async update(id: string, dto: Partial<CreateTherapistProfileDto>) {
    await this.findOne(id);
    return this.prisma.therapistProfile.update({ where: { id }, data: dto });
  }

  async getPatients(therapistId: string) {
    const episodes = await this.prisma.programEpisode.findMany({
      where: { therapistId, status: 'ACTIVE' },
      include: {
        patient: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    return episodes.map((e) => ({
      episodeId: e.id,
      patient: e.patient,
      currentWeek: e.currentWeek,
      durationWeeks: e.durationWeeks,
      status: e.status,
    }));
  }

  async getEpisodes(therapistId: string) {
    return this.prisma.programEpisode.findMany({
      where: { therapistId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async getDashboardPatients(therapistId: string) {
    // Get all patients invited by this therapist, grouped by status
    const patients = await this.prisma.patientProfile.findMany({
      where: { invitedByTherapistId: therapistId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        invitation: {
          select: {
            id: true,
            token: true,
            firstName: true,
            lastName: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        programEpisodes: {
          where: { therapistId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            currentWeek: true,
            durationWeeks: true,
            startDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by status
    const invited = patients.filter((p) => p.status === 'INVITED');
    const registered = patients.filter((p) => p.status === 'REGISTERED');
    const pendingPayment = patients.filter((p) => p.status === 'PENDING_PAYMENT');
    const pendingScheduling = patients.filter((p) => p.status === 'PENDING_SCHEDULING');
    const active = patients.filter((p) => p.status === 'ACTIVE');
    const completed = patients.filter((p) => p.status === 'COMPLETED');
    const discharged = patients.filter((p) => p.status === 'DISCHARGED');
    const paused = patients.filter((p) => p.status === 'PAUSED');

    // Generate invite links for INVITED patients
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitedWithLinks = invited.map((p) => ({
      ...p,
      inviteLink: p.invitation ? `${baseUrl}/signup/patient/invited/${p.invitation.token}` : null,
    }));

    return {
      active: active.map((p) => this.formatPatientForDashboard(p)),
      pending: {
        invited: invitedWithLinks.map((p) => this.formatPendingPatient(p)),
        registered: registered.map((p) => this.formatPendingPatient(p)),
        pendingPayment: pendingPayment.map((p) => this.formatPendingPatient(p)),
        pendingScheduling: pendingScheduling.map((p) => this.formatPendingPatient(p)),
      },
      completed: completed.map((p) => this.formatPatientForDashboard(p)),
      paused: paused.map((p) => this.formatPatientForDashboard(p)),
      discharged: discharged.map((p) => this.formatPatientForDashboard(p)),
      stats: {
        totalInvited: invited.length,
        totalRegistered: registered.length,
        totalPendingPayment: pendingPayment.length,
        totalPendingScheduling: pendingScheduling.length,
        totalActive: active.length,
        totalCompleted: completed.length,
        totalPaused: paused.length,
        totalDischarged: discharged.length,
      },
    };
  }

  private formatPatientForDashboard(patient: any) {
    const episode = patient.programEpisodes?.[0];
    return {
      id: patient.id,
      status: patient.status,
      user: patient.user,
      ageRange: patient.ageRange,
      country: patient.country,
      city: patient.city,
      conditionDescription: patient.conditionDescription,
      createdAt: patient.createdAt,
      episode: episode
        ? {
            id: episode.id,
            status: episode.status,
            currentWeek: episode.currentWeek,
            durationWeeks: episode.durationWeeks,
            startDate: episode.startDate,
          }
        : null,
    };
  }

  private formatPendingPatient(patient: any) {
    return {
      id: patient.id,
      status: patient.status,
      user: patient.user,
      // For INVITED patients, use invitation data
      firstName: patient.user?.firstName || patient.invitation?.firstName,
      lastName: patient.user?.lastName || patient.invitation?.lastName,
      email: patient.user?.email,
      ageRange: patient.ageRange,
      conditionDescription: patient.conditionDescription,
      createdAt: patient.createdAt,
      invitation: patient.invitation
        ? {
            id: patient.invitation.id,
            status: patient.invitation.status,
            expiresAt: patient.invitation.expiresAt,
            createdAt: patient.invitation.createdAt,
          }
        : null,
      inviteLink: (patient as any).inviteLink || null,
    };
  }

  async getScheduledVisits(therapistId: string, startDate?: Date, endDate?: Date) {
    // Get first meetings from PatientTherapistRelationship
    const relationships = await this.prisma.patientTherapistRelationship.findMany({
      where: {
        therapistId,
        scheduledAt: {
          not: null,
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Get regular sessions from Session (via episodes)
    const sessions = await this.prisma.session.findMany({
      where: {
        episode: { therapistId },
        scheduledDate: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      },
      include: {
        episode: {
          include: {
            patient: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Format first meetings
    const firstMeetings = relationships.map((rel) => ({
      id: rel.id,
      type: 'FIRST_MEETING' as const,
      scheduledDate: rel.scheduledAt,
      status: rel.status,
      patient: {
        id: rel.patient.id,
        firstName: rel.patient.user?.firstName,
        lastName: rel.patient.user?.lastName,
        email: rel.patient.user?.email,
      },
      discipline: rel.discipline,
    }));

    // Format regular sessions
    const regularSessions = sessions.map((session) => ({
      id: session.id,
      type: 'SESSION' as const,
      scheduledDate: session.scheduledDate,
      scheduledTime: session.scheduledTime,
      status: session.status,
      patient: {
        id: session.episode.patient.id,
        firstName: session.episode.patient.user?.firstName,
        lastName: session.episode.patient.user?.lastName,
        email: session.episode.patient.user?.email,
      },
      episodeId: session.episodeId,
    }));

    // Combine and sort by date
    const allVisits = [...firstMeetings, ...regularSessions].sort((a, b) => {
      const dateA = new Date(a.scheduledDate!).getTime();
      const dateB = new Date(b.scheduledDate!).getTime();
      return dateA - dateB;
    });

    return allVisits;
  }
}
