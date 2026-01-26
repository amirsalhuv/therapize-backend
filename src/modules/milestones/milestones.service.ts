import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import {
  MilestoneStatus,
  MilestoneType,
  MilestoneTriggerType,
  Prisma,
} from '@prisma/client';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  TimelineResponseDto,
  TimelineMilestoneDto,
  ProgramSummaryDto,
} from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  async getEpisodeMilestones(episodeId: string) {
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    return this.prisma.episodeMilestone.findMany({
      where: { episodeId },
      orderBy: [{ targetWeek: 'asc' }, { orderIndex: 'asc' }],
      include: {
        template: true,
        linkedSession: true,
      },
    });
  }

  async createMilestone(episodeId: string, dto: CreateMilestoneDto) {
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    const targetDate = this.calculateTargetDate(
      episode.startDate,
      dto.targetWeek,
    );

    return this.prisma.episodeMilestone.create({
      data: {
        episodeId,
        type: dto.type,
        name: dto.name,
        nameHe: dto.nameHe,
        description: dto.description,
        descriptionHe: dto.descriptionHe,
        targetWeek: dto.targetWeek,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : targetDate,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig as Prisma.InputJsonValue,
        orderIndex: dto.orderIndex ?? dto.targetWeek * 10,
      },
    });
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.episodeMilestone.findUnique({
      where: { id },
      include: { episode: true },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    const updateData: Prisma.EpisodeMilestoneUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameHe !== undefined) updateData.nameHe = dto.nameHe;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.descriptionHe !== undefined)
      updateData.descriptionHe = dto.descriptionHe;
    if (dto.targetWeek !== undefined) {
      updateData.targetWeek = dto.targetWeek;
      updateData.targetDate = this.calculateTargetDate(
        milestone.episode.startDate,
        dto.targetWeek,
      );
    }
    if (dto.targetDate !== undefined)
      updateData.targetDate = new Date(dto.targetDate);
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.triggerConfig !== undefined)
      updateData.triggerConfig = dto.triggerConfig as Prisma.InputJsonValue;
    if (dto.orderIndex !== undefined) updateData.orderIndex = dto.orderIndex;

    return this.prisma.episodeMilestone.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteMilestone(id: string) {
    const milestone = await this.prisma.episodeMilestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    return this.prisma.episodeMilestone.delete({
      where: { id },
    });
  }

  async completeMilestone(
    id: string,
    linkedSessionId?: string,
  ) {
    const milestone = await this.prisma.episodeMilestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    return this.prisma.episodeMilestone.update({
      where: { id },
      data: {
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date(),
        linkedSessionId,
      },
    });
  }

  async skipMilestone(id: string) {
    const milestone = await this.prisma.episodeMilestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    return this.prisma.episodeMilestone.update({
      where: { id },
      data: {
        status: MilestoneStatus.SKIPPED,
      },
    });
  }

  async completeBaselineAssessment(episodeId: string) {
    const milestone = await this.prisma.episodeMilestone.findFirst({
      where: {
        episodeId,
        type: MilestoneType.BASELINE_ASSESSMENT,
        status: MilestoneStatus.PENDING,
      },
    });

    if (!milestone) {
      return null;
    }

    return this.prisma.episodeMilestone.update({
      where: { id: milestone.id },
      data: {
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async initializeEpisodeMilestones(episodeId: string) {
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
      include: {
        therapist: {
          include: { user: true },
        },
        relationship: true,
      },
    });

    if (!episode) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    const templates = await this.prisma.milestoneTemplate.findMany({
      where: {
        isSystemDefault: true,
        OR: [
          { discipline: null },
          { discipline: episode.relationship?.discipline },
        ],
      },
      orderBy: { defaultWeek: 'asc' },
    });

    const milestoneData: Prisma.EpisodeMilestoneCreateManyInput[] = [];
    const therapistName = episode.therapist?.user
      ? `${episode.therapist.user.firstName} ${episode.therapist.user.lastName}`
      : null;

    for (const template of templates) {
      if (template.isRecurring && template.recurrenceWeeks) {
        for (
          let week = template.defaultWeek;
          week <= episode.durationWeeks;
          week += template.recurrenceWeeks
        ) {
          milestoneData.push(
            this.createMilestoneFromTemplate(
              template,
              episode,
              week,
              therapistName,
            ),
          );
        }
      } else {
        milestoneData.push(
          this.createMilestoneFromTemplate(
            template,
            episode,
            template.defaultWeek,
            therapistName,
          ),
        );
      }
    }

    await this.prisma.episodeMilestone.createMany({ data: milestoneData });

    return this.getEpisodeMilestones(episodeId);
  }

  async getPatientTimeline(patientId: string): Promise<TimelineResponseDto> {
    const episodes = await this.prisma.programEpisode.findMany({
      where: {
        patient: {
          userId: patientId,
        },
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      include: {
        therapist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        relationship: true,
        milestones: {
          orderBy: [{ targetWeek: 'asc' }, { orderIndex: 'asc' }],
        },
        patientPlans: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    const programs: ProgramSummaryDto[] = episodes.map((ep) => ({
      episodeId: ep.id,
      programName: ep.patientPlans[0]?.name || 'Treatment Program',
      therapistName: ep.therapist?.user
        ? `${ep.therapist.user.firstName} ${ep.therapist.user.lastName}`
        : 'Unknown',
      discipline: ep.relationship?.discipline || undefined,
      currentWeek: ep.currentWeek,
      totalWeeks: ep.durationWeeks,
      status: ep.status,
    }));

    const allMilestones: TimelineMilestoneDto[] = episodes.flatMap((ep) =>
      ep.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        nameHe: m.nameHe || undefined,
        week: m.targetWeek,
        type: m.type,
        status: m.status,
        targetDate: m.targetDate?.toISOString(),
        completedAt: m.completedAt?.toISOString(),
        description: m.description || undefined,
        descriptionHe: m.descriptionHe || undefined,
        therapistName: m.therapistName || undefined,
        episodeId: ep.id,
      })),
    );

    allMilestones.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      if (a.targetDate && b.targetDate) {
        return (
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        );
      }
      return 0;
    });

    return { programs, milestones: allMilestones };
  }

  async resetToDefaults(episodeId: string) {
    await this.prisma.episodeMilestone.deleteMany({
      where: { episodeId },
    });

    return this.initializeEpisodeMilestones(episodeId);
  }

  private createMilestoneFromTemplate(
    template: {
      id: string;
      type: MilestoneType;
      name: string;
      nameHe: string | null;
      description: string | null;
      descriptionHe: string | null;
      triggerType: MilestoneTriggerType;
      triggerConfig: Prisma.JsonValue;
    },
    episode: { id: string; startDate: Date },
    week: number,
    therapistName: string | null,
  ): Prisma.EpisodeMilestoneCreateManyInput {
    return {
      episodeId: episode.id,
      templateId: template.id,
      type: template.type,
      name: template.name,
      nameHe: template.nameHe,
      description: template.description,
      descriptionHe: template.descriptionHe,
      targetWeek: week,
      targetDate: this.calculateTargetDate(episode.startDate, week),
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig || undefined,
      status: MilestoneStatus.PENDING,
      orderIndex: week * 10,
      therapistName,
    };
  }

  private calculateTargetDate(startDate: Date, week: number): Date {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (week - 1) * 7);
    return date;
  }
}
