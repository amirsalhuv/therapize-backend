import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreateSessionDto, SessionFeedbackDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(episodeId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = episodeId ? { episodeId } : {};

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        skip,
        take: limit,
        where,
        orderBy: { scheduledDate: 'desc' },
        include: { feedback: true },
      }),
      this.prisma.session.count({ where }),
    ]);

    return { sessions, total, page, limit };
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        feedback: true,
        sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: 'asc' } },
        itemFeedbacks: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    // Return formatted session matching TodaySession type
    return {
      id: session.id,
      sessionNumber: 1, // Default, can be updated if needed
      status: session.status,
      scheduledDate: session.scheduledDate.toISOString(),
      startedAt: session.startedAt, // Include for internal use
      durationMinutes: session.durationMinutes,
      exercises: session.sessionExercises.map((se) => ({
        id: se.id,
        orderIndex: se.orderIndex,
        customInstructions: se.customInstructions,
        exercise: se.exercise,
      })),
      feedback: session.feedback,
      summary:
        session.status === 'COMPLETED'
          ? {
              exercisesCompleted: session.sessionExercises.length,
              exercisesSkipped: 0,
              totalDuration: session.durationMinutes || 0,
              averageRating: session.feedback?.overallRating,
            }
          : undefined,
    };
  }

  async getTodaySession(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all sessions for today
    const todaySessions = await this.prisma.session.findMany({
      where: {
        episode: { patientId: patient.id },
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: {
        sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: 'asc' } },
        episode: {
          select: {
            id: true,
            currentWeek: true,
            durationWeeks: true,
            patientPlans: { where: { isActive: true }, take: 1, select: { id: true, name: true } },
          },
        },
        feedback: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Separate completed from pending sessions
    const completedSessions = todaySessions.filter((s) => s.status === 'COMPLETED');
    const pendingSessions = todaySessions.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    );

    // Get episode info from first session or find active episode
    const episode = todaySessions[0]?.episode || null;
    const episodeInfo = episode
      ? {
          id: episode.id,
          currentWeek: episode.currentWeek,
          durationWeeks: episode.durationWeeks,
          patientPlan: episode.patientPlans?.[0] || null,
        }
      : null;

    // Build response
    const maxSessionsPerDay = 2;
    const sessionsCompletedToday = completedSessions.length;

    // Format session for response
    const formatSession = (session: (typeof todaySessions)[0], sessionNumber: number) => ({
      id: session.id,
      sessionNumber,
      status: session.status,
      scheduledDate: session.scheduledDate.toISOString(),
      durationMinutes: session.durationMinutes,
      exercises: session.sessionExercises.map((se) => ({
        id: se.id,
        orderIndex: se.orderIndex,
        customInstructions: se.customInstructions,
        exercise: se.exercise,
      })),
      feedback: session.feedback,
      summary:
        session.status === 'COMPLETED'
          ? {
              exercisesCompleted: session.sessionExercises.length,
              exercisesSkipped: 0, // TODO: track skipped exercises
              totalDuration: session.durationMinutes || 0,
              averageRating: session.feedback?.overallRating,
            }
          : undefined,
    });

    return {
      currentSession: pendingSessions[0] ? formatSession(pendingSessions[0], sessionsCompletedToday + 1) : null,
      completedSession: completedSessions[0] ? formatSession(completedSessions[0], 1) : undefined,
      bonusSession:
        sessionsCompletedToday === 1 && pendingSessions[0]
          ? formatSession(pendingSessions[0], 2)
          : sessionsCompletedToday === 0 && pendingSessions[1]
            ? formatSession(pendingSessions[1], 2)
            : undefined,
      episode: episodeInfo,
      sessionsCompletedToday,
      maxSessionsPerDay,
    };
  }

  async pauseSession(id: string) {
    const session = await this.findOne(id);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session not in progress');
    }

    return this.prisma.session.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resumeSession(id: string) {
    const session = await this.findOne(id);
    if (session.status !== 'PAUSED') {
      throw new BadRequestException('Session not paused');
    }

    return this.prisma.session.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  async stopSession(id: string, reason?: string) {
    const session = await this.findOne(id);
    if (session.status !== 'IN_PROGRESS' && session.status !== 'PAUSED') {
      throw new BadRequestException('Session not in progress or paused');
    }

    const startedAt = session.startedAt || new Date();
    const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

    return this.prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        durationMinutes,
        // Store stop reason in notes if needed
      },
    });
  }

  async create(dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        episodeId: dto.episodeId,
        planId: dto.planId,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
      },
    });
  }

  async startSession(id: string) {
    const session = await this.findOne(id);
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException('Session already started or completed');
    }

    return this.prisma.session.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async completeSession(id: string) {
    const session = await this.findOne(id);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session not in progress');
    }

    const startedAt = session.startedAt || new Date();
    const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000);

    return this.prisma.session.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), durationMinutes },
    });
  }

  async submitFeedback(sessionId: string, dto: SessionFeedbackDto) {
    const session = await this.findOne(sessionId);
    if (session.status !== 'COMPLETED' && session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot submit feedback for this session');
    }

    return this.prisma.sessionFeedback.upsert({
      where: { sessionId },
      create: { sessionId, ...dto },
      update: dto,
    });
  }

  async getFeedback(sessionId: string) {
    return this.prisma.sessionFeedback.findUnique({ where: { sessionId } });
  }
}
