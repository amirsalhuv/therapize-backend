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
    return session;
  }

  async getTodaySession(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const session = await this.prisma.session.findFirst({
      where: {
        episode: { patientId: patient.id },
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: {
        sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: 'asc' } },
        episode: { select: { currentWeek: true, durationWeeks: true } },
      },
    });

    return session;
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
