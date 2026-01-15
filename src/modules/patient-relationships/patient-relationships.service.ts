import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { TherapyDiscipline } from '@prisma/client';

@Injectable()
export class PatientRelationshipsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get suggested programs for a patient based on their profile
   * For MVP: Returns the inviting therapist's discipline + other available disciplines
   */
  async getSuggestedPrograms(patientId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        invitedByTherapist: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const suggestions: Array<{
      discipline: TherapyDiscipline;
      name: string;
      description: string;
      isRecommended: boolean;
      therapistName?: string;
    }> = [];
    const invitingTherapist = patient.invitedByTherapist;

    // Add inviting therapist's discipline as recommended
    if (invitingTherapist?.discipline) {
      suggestions.push({
        discipline: invitingTherapist.discipline,
        name: this.getDisciplineName(invitingTherapist.discipline),
        description: this.getDisciplineDescription(invitingTherapist.discipline),
        isRecommended: true,
        therapistName: `${invitingTherapist.user.firstName} ${invitingTherapist.user.lastName}`,
      });
    }

    // Add other available disciplines
    const allDisciplines: TherapyDiscipline[] = [
      TherapyDiscipline.PT,
      TherapyDiscipline.OT,
      TherapyDiscipline.ST,
      TherapyDiscipline.MT,
    ];
    for (const discipline of allDisciplines) {
      if (discipline !== invitingTherapist?.discipline) {
        suggestions.push({
          discipline,
          name: this.getDisciplineName(discipline),
          description: this.getDisciplineDescription(discipline),
          isRecommended: false,
        });
      }
    }

    return suggestions;
  }

  /**
   * Patient selects programs/disciplines - creates relationships with auto-assigned therapists
   */
  async selectPrograms(patientId: string, disciplines: TherapyDiscipline[]) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { invitedByTherapist: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.status !== 'REGISTERED') {
      throw new BadRequestException('Patient must be in REGISTERED status to select programs');
    }

    const relationships: any[] = [];

    for (const discipline of disciplines) {
      // Auto-assign therapist for this discipline
      const therapist = await this.findAvailableTherapist(discipline, patient);

      if (!therapist) {
        throw new BadRequestException(`No available therapist found for ${discipline}`);
      }

      // Check if relationship already exists
      const existing = await this.prisma.patientTherapistRelationship.findUnique({
        where: {
          patientId_therapistId: {
            patientId,
            therapistId: therapist.id,
          },
        },
      });

      if (existing) {
        relationships.push(existing);
        continue;
      }

      // Create relationship
      const relationship = await this.prisma.patientTherapistRelationship.create({
        data: {
          patientId,
          therapistId: therapist.id,
          discipline,
          status: 'PENDING_PAYMENT',
          isInvitingTherapist: therapist.id === patient.invitedByTherapistId,
        },
        include: {
          therapist: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Complete payment for a relationship - transitions to PENDING_SCHEDULING
   * For MVP: All payments are $0, so this just validates and transitions
   */
  async completePayment(relationshipId: string) {
    const relationship = await this.prisma.patientTherapistRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    if (relationship.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Relationship must be in PENDING_PAYMENT status');
    }

    return this.prisma.patientTherapistRelationship.update({
      where: { id: relationshipId },
      data: { status: 'PENDING_SCHEDULING' },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        therapist: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Schedule first meeting - transitions to SCHEDULED_FIRST_MEETING
   * Also creates a ProgramEpisode so the first session form can be created
   */
  async scheduleFirstMeeting(relationshipId: string, scheduledAt: Date) {
    const relationship = await this.prisma.patientTherapistRelationship.findUnique({
      where: { id: relationshipId },
      include: { programEpisode: true },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    if (relationship.status !== 'PENDING_SCHEDULING') {
      throw new BadRequestException('Relationship must be in PENDING_SCHEDULING status');
    }

    // Create episode if it doesn't exist
    let episodeId = relationship.programEpisode?.id;
    if (!episodeId) {
      const startDate = new Date(scheduledAt);
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + 12 * 7); // 12 weeks

      const episode = await this.prisma.programEpisode.create({
        data: {
          patientId: relationship.patientId,
          therapistId: relationship.therapistId,
          relationshipId: relationship.id,
          status: 'ACTIVE',
          durationWeeks: 12,
          currentWeek: 1,
          startDate,
          expectedEndDate,
        },
      });
      episodeId = episode.id;
    }

    return this.prisma.patientTherapistRelationship.update({
      where: { id: relationshipId },
      data: {
        status: 'SCHEDULED_FIRST_MEETING',
        scheduledAt,
      },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        therapist: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        programEpisode: true,
      },
    });
  }

  /**
   * Reschedule first meeting - updates scheduledAt without changing status
   */
  async rescheduleFirstMeeting(relationshipId: string, scheduledAt: Date) {
    const relationship = await this.prisma.patientTherapistRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    if (relationship.status !== 'SCHEDULED_FIRST_MEETING') {
      throw new BadRequestException('Can only reschedule meetings in SCHEDULED_FIRST_MEETING status');
    }

    return this.prisma.patientTherapistRelationship.update({
      where: { id: relationshipId },
      data: { scheduledAt },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        therapist: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        programEpisode: true,
      },
    });
  }

  /**
   * Get relationship by ID
   */
  async findOne(id: string) {
    const relationship = await this.prisma.patientTherapistRelationship.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        therapist: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        programEpisode: true,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relationship not found');
    }

    return relationship;
  }

  /**
   * Get all relationships for a patient
   */
  async findByPatient(patientId: string) {
    return this.prisma.patientTherapistRelationship.findMany({
      where: { patientId },
      include: {
        therapist: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        programEpisode: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all relationships for a therapist
   */
  async findByTherapist(therapistId: string) {
    return this.prisma.patientTherapistRelationship.findMany({
      where: { therapistId },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        programEpisode: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get therapist's dashboard data grouped by relationship status
   */
  async getTherapistDashboard(therapistId: string) {
    // Get all relationships for this therapist
    const relationships = await this.prisma.patientTherapistRelationship.findMany({
      where: { therapistId },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            invitation: {
              select: { id: true, firstName: true, lastName: true, status: true, expiresAt: true },
            },
          },
        },
        programEpisode: {
          select: { id: true, status: true, currentWeek: true, durationWeeks: true, startDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get INVITED patients (no relationship yet)
    const invitedPatients = await this.prisma.patientProfile.findMany({
      where: {
        invitedByTherapistId: therapistId,
        status: 'INVITED',
      },
      include: {
        invitation: {
          select: { id: true, token: true, firstName: true, lastName: true, status: true, expiresAt: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get REGISTERED patients (no relationship yet - haven't selected programs)
    const registeredPatients = await this.prisma.patientProfile.findMany({
      where: {
        invitedByTherapistId: therapistId,
        status: 'REGISTERED',
        therapistRelationships: { none: {} },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group relationships by status
    const pendingPayment = relationships.filter(r => r.status === 'PENDING_PAYMENT');
    const pendingScheduling = relationships.filter(r => r.status === 'PENDING_SCHEDULING');
    const scheduledFirstMeeting = relationships.filter(r => r.status === 'SCHEDULED_FIRST_MEETING');
    const active = relationships.filter(r => r.status === 'ACTIVE');
    const completed = relationships.filter(r => r.status === 'COMPLETED');
    const paused = relationships.filter(r => r.status === 'PAUSED');
    const discharged = relationships.filter(r => r.status === 'DISCHARGED');

    // Generate invite links for INVITED patients
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitedWithLinks = invitedPatients.map(p => ({
      id: p.id,
      firstName: p.invitation?.firstName,
      lastName: p.invitation?.lastName,
      status: p.status,
      invitation: p.invitation ? {
        id: p.invitation.id,
        status: p.invitation.status,
        expiresAt: p.invitation.expiresAt,
        createdAt: p.invitation.createdAt,
      } : null,
      inviteLink: p.invitation ? `${baseUrl}/signup/patient/invited/${p.invitation.token}` : null,
      createdAt: p.createdAt,
    }));

    return {
      invited: invitedWithLinks,
      registered: registeredPatients.map(p => ({
        id: p.id,
        user: p.user,
        status: p.status,
        createdAt: p.createdAt,
      })),
      pendingPayment: this.formatRelationships(pendingPayment),
      pendingScheduling: this.formatRelationships(pendingScheduling),
      scheduledFirstMeeting: this.formatRelationships(scheduledFirstMeeting),
      active: this.formatRelationships(active),
      completed: this.formatRelationships(completed),
      paused: this.formatRelationships(paused),
      discharged: this.formatRelationships(discharged),
      stats: {
        totalInvited: invitedPatients.length,
        totalRegistered: registeredPatients.length,
        totalPendingPayment: pendingPayment.length,
        totalPendingScheduling: pendingScheduling.length,
        totalScheduledFirstMeeting: scheduledFirstMeeting.length,
        totalActive: active.length,
        totalCompleted: completed.length,
        totalPaused: paused.length,
        totalDischarged: discharged.length,
      },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private formatRelationships(relationships: any[]) {
    return relationships.map(r => ({
      id: r.id,
      status: r.status,
      discipline: r.discipline,
      scheduledAt: r.scheduledAt,
      createdAt: r.createdAt,
      patient: {
        id: r.patient.id,
        user: r.patient.user,
      },
      episode: r.programEpisode ? {
        id: r.programEpisode.id,
        status: r.programEpisode.status,
        currentWeek: r.programEpisode.currentWeek,
        durationWeeks: r.programEpisode.durationWeeks,
        startDate: r.programEpisode.startDate,
      } : null,
    }));
  }

  /**
   * Find an available therapist for the given discipline
   * For MVP: Use inviting therapist if same discipline, otherwise pick first available
   */
  private async findAvailableTherapist(discipline: TherapyDiscipline, patient: any) {
    // First, try inviting therapist if they match the discipline
    if (patient.invitedByTherapist?.discipline === discipline) {
      return patient.invitedByTherapist;
    }

    // Otherwise, find first available therapist with this discipline
    return this.prisma.therapistProfile.findFirst({
      where: {
        discipline,
        acceptingNewPatients: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private getDisciplineName(discipline: TherapyDiscipline): string {
    const names: Record<TherapyDiscipline, string> = {
      PT: 'Physical Therapy',
      OT: 'Occupational Therapy',
      ST: 'Speech Therapy',
      MT: 'Mental Health Therapy',
    };
    return names[discipline];
  }

  private getDisciplineDescription(discipline: TherapyDiscipline): string {
    const descriptions: Record<TherapyDiscipline, string> = {
      PT: 'Improve movement, reduce pain, and restore function through physical exercises',
      OT: 'Develop skills for daily living activities and independence',
      ST: 'Improve speech, language, and communication abilities',
      MT: 'Support mental health through counseling and psychological techniques',
    };
    return descriptions[discipline];
  }
}
