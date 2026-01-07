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

  async getPrograms(therapistId: string) {
    return this.prisma.programTemplate.findMany({
      where: { createdById: therapistId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
