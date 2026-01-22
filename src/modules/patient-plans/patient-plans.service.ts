import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database';
import { UpdateActiveExercisesDto } from './dto/update-active-exercises.dto';

@Injectable()
export class PatientPlansService {
  constructor(private prisma: PrismaService) {}

  async findOne(planId: string) {
    const plan = await this.prisma.patientPlan.findUnique({
      where: { id: planId },
      include: {
        episode: {
          include: {
            therapist: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Patient plan not found');
    }

    return plan;
  }

  async getActivePlanByEpisode(episodeId: string) {
    const plan = await this.prisma.patientPlan.findFirst({
      where: {
        episodeId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!plan) {
      return null;
    }

    return {
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
      exercises: plan.activeExercises || [],
    };
  }

  async getActiveExercises(planId: string) {
    const plan = await this.findOne(planId);

    return {
      exercises: plan.activeExercises || [],
      planName: plan.name,
      isActive: plan.isActive,
    };
  }

  async updateActiveExercises(
    planId: string,
    updateDto: UpdateActiveExercisesDto,
    therapistId: string,
  ) {
    // 1. Verify plan exists and therapist has access
    const plan = await this.prisma.patientPlan.findFirst({
      where: { id: planId },
      include: {
        episode: {
          include: {
            therapist: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Patient plan not found');
    }

    if (plan.episode.therapistId !== therapistId) {
      throw new ForbiddenException('Not authorized to modify this plan');
    }

    // 2. Validate all exercises exist
    const exerciseIds = updateDto.activeExercises.map((e) => e.exerciseId);
    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, isDeleted: false },
    });

    if (exercises.length !== exerciseIds.length) {
      throw new BadRequestException('One or more exercises not found');
    }

    // 3. Update plan with new activeExercises
    const updated = await this.prisma.patientPlan.update({
      where: { id: planId },
      data: {
        activeExercises: updateDto.activeExercises as any,
        updatedAt: new Date(),
      },
      include: {
        episode: true,
      },
    });

    return updated;
  }
}
