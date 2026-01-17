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

    // Query active episode independently (not dependent on today's sessions)
    const activeEpisode = await this.prisma.programEpisode.findFirst({
      where: { patientId: patient.id, status: 'ACTIVE' },
      select: {
        id: true,
        currentWeek: true,
        durationWeeks: true,
        patientPlans: { where: { isActive: true }, take: 1, select: { id: true, name: true } },
      },
    });

    const episodeInfo = activeEpisode
      ? {
          id: activeEpisode.id,
          currentWeek: activeEpisode.currentWeek,
          durationWeeks: activeEpisode.durationWeeks,
          patientPlan: activeEpisode.patientPlans?.[0] || null,
        }
      : null;

    // Auto-create session for today if none exists and patient has active episode
    if (activeEpisode) {
      await this.createTodaySessionIfNeeded(activeEpisode.id, today);
    }

    // Get all sessions for today
    const todaySessions = await this.prisma.session.findMany({
      where: {
        episode: { patientId: patient.id },
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: {
        sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: 'asc' } },
        feedback: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Separate completed from pending sessions
    const completedSessions = todaySessions.filter((s) => s.status === 'COMPLETED');
    const pendingSessions = todaySessions.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS' || s.status === 'PAUSED',
    );

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

  /**
   * Get exercises for a new session.
   * Strategy 1: Copy from most recent completed session in this episode
   * Strategy 2: Fall back to template exercises if no previous sessions
   * Strategy 3: Return empty if no source available
   */
  private async getExercisesForNewSession(episodeId: string): Promise<{ exerciseId: string; orderIndex: number }[]> {
    // Strategy 1: Copy from most recent session with exercises
    const recentSession = await this.prisma.session.findFirst({
      where: { episodeId },
      orderBy: { scheduledDate: 'desc' },
      include: { sessionExercises: { orderBy: { orderIndex: 'asc' } } },
    });

    if (recentSession?.sessionExercises.length) {
      return recentSession.sessionExercises.map((se) => ({
        exerciseId: se.exerciseId,
        orderIndex: se.orderIndex,
      }));
    }

    // Strategy 2: Get exercises from patient plan's template
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
      include: {
        patientPlans: {
          where: { isActive: true },
          take: 1,
          include: { template: { include: { exercises: true } } },
        },
      },
    });

    const templateExercises = episode?.patientPlans?.[0]?.template?.exercises;
    if (templateExercises?.length) {
      return templateExercises.map((ex, idx) => ({
        exerciseId: ex.id,
        orderIndex: idx,
      }));
    }

    // Strategy 3: Return empty array (patient will see empty session)
    return [];
  }

  /**
   * Create a session for today if none exists for this episode.
   */
  private async createTodaySessionIfNeeded(episodeId: string, today: Date): Promise<void> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if session already exists for today
    const existingSession = await this.prisma.session.findFirst({
      where: {
        episodeId,
        scheduledDate: { gte: today, lt: tomorrow },
      },
    });

    if (existingSession) return;

    // Get exercises for the new session
    const exercises = await this.getExercisesForNewSession(episodeId);

    // Create new session with exercises
    await this.prisma.session.create({
      data: {
        episodeId,
        scheduledDate: today,
        status: 'SCHEDULED',
        sessionExercises: {
          create: exercises.map((e) => ({
            exerciseId: e.exerciseId,
            orderIndex: e.orderIndex,
          })),
        },
      },
    });
  }
}
