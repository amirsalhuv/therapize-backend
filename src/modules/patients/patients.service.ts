import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreatePatientProfileDto, UpdatePatientProfileDto } from './dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [patients, total] = await Promise.all([
      this.prisma.patientProfile.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patientProfile.count(),
    ]);

    return { patients, total, page, limit };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, status: true },
        },
        programEpisodes: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async findByUserId(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient;
  }

  async create(userId: string, dto: CreatePatientProfileDto) {
    return this.prisma.patientProfile.create({
      data: { userId, ...dto },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, dto: UpdatePatientProfileDto) {
    await this.findOne(id);
    return this.prisma.patientProfile.update({
      where: { id },
      data: dto,
    });
  }

  async getEpisodes(patientId: string) {
    return this.prisma.programEpisode.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async getDocuments(patientId: string) {
    return this.prisma.medicalDocument.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSessions(patientId: string, limit = 10) {
    const episodes = await this.prisma.programEpisode.findMany({
      where: { patientId },
      select: { id: true },
    });

    const episodeIds = episodes.map((e) => e.id);

    return this.prisma.session.findMany({
      where: { episodeId: { in: episodeIds } },
      take: limit,
      orderBy: { scheduledDate: 'desc' },
      include: { feedback: true },
    });
  }
}
