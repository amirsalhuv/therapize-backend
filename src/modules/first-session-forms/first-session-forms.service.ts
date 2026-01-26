import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFirstSessionFormDto, UpdateFirstSessionFormDto, UpdateGoalsDto } from './dto';
import { FirstSessionFormStatus } from '@prisma/client';
import { MilestonesService } from '../milestones/milestones.service';

@Injectable()
export class FirstSessionFormsService {
  constructor(
    private prisma: PrismaService,
    private milestonesService: MilestonesService,
  ) {}

  async create(dto: CreateFirstSessionFormDto, therapistId: string) {
    // Verify episode exists and belongs to therapist
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: dto.episodeId },
    });

    if (!episode) {
      throw new NotFoundException('Program episode not found');
    }

    if (episode.therapistId !== therapistId) {
      throw new ForbiddenException(
        'You are not authorized to create a form for this episode',
      );
    }

    // Check if form already exists for this episode
    const existingForm = await this.prisma.firstSessionForm.findUnique({
      where: { episodeId: dto.episodeId },
    });

    if (existingForm) {
      throw new BadRequestException(
        'A first session form already exists for this episode',
      );
    }

    return this.prisma.firstSessionForm.create({
      data: {
        episodeId: dto.episodeId,
        status: FirstSessionFormStatus.DRAFT,
      },
      include: {
        episode: {
          include: {
            patient: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByEpisodeId(episodeId: string, therapistId: string) {
    const form = await this.prisma.firstSessionForm.findUnique({
      where: { episodeId },
      include: {
        episode: true,
      },
    });

    if (!form) {
      throw new NotFoundException('First session form not found');
    }

    if (form.episode.therapistId !== therapistId) {
      throw new ForbiddenException(
        'You are not authorized to view this form',
      );
    }

    return form;
  }

  async findOne(id: string, therapistId: string) {
    const form = await this.prisma.firstSessionForm.findUnique({
      where: { id },
      include: {
        episode: true,
      },
    });

    if (!form) {
      throw new NotFoundException('First session form not found');
    }

    if (form.episode.therapistId !== therapistId) {
      throw new ForbiddenException(
        'You are not authorized to view this form',
      );
    }

    return form;
  }

  async update(id: string, dto: UpdateFirstSessionFormDto, therapistId: string) {
    // Verify access
    await this.findOne(id, therapistId);

    const updateData: Record<string, unknown> = {};

    if (dto.basicData !== undefined) {
      updateData.basicData = dto.basicData;
    }
    if (dto.performanceTests !== undefined) {
      updateData.performanceTests = dto.performanceTests;
    }
    if (dto.therapyGoals !== undefined) {
      updateData.therapyGoals = dto.therapyGoals;
    }
    if (dto.onboarding !== undefined) {
      updateData.onboarding = dto.onboarding;
    }
    if (dto.initialProgram !== undefined) {
      updateData.initialProgram = dto.initialProgram;
    }

    return this.prisma.firstSessionForm.update({
      where: { id },
      data: updateData,
    });
  }

  async complete(id: string, therapistId: string) {
    const form = await this.findOne(id, therapistId) as any;

    // Validate required fields
    const basicData = form.basicData as Record<string, unknown> | null;
    const therapyGoals = form.therapyGoals as Record<string, unknown> | null;
    const initialProgram = form.initialProgram as { exercises: any[] } | null;

    if (!basicData) {
      throw new BadRequestException('Basic data is required to complete the form');
    }

    if (!therapyGoals || !Array.isArray(therapyGoals.goals) || therapyGoals.goals.length === 0) {
      throw new BadRequestException('At least one therapy goal is required to complete the form');
    }

    if (!initialProgram?.exercises || !Array.isArray(initialProgram.exercises) || initialProgram.exercises.length < 1) {
      throw new BadRequestException(
        'At least one exercise is required to complete the first session form'
      );
    }

    // Update form status
    const updatedForm = await this.prisma.firstSessionForm.update({
      where: { id },
      data: {
        status: FirstSessionFormStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        episode: {
          include: {
            relationship: true,
          },
        },
      },
    });

    // Copy goals to ProgramEpisode
    await this.prisma.programEpisode.update({
      where: { id: form.episodeId },
      data: {
        goals: therapyGoals as object,
      },
    });

    // Update relationship status to ACTIVE if it was in SCHEDULED_FIRST_MEETING
    if (updatedForm.episode?.relationshipId) {
      await this.prisma.patientTherapistRelationship.update({
        where: { id: updatedForm.episode.relationshipId },
        data: { status: 'ACTIVE' },
      });

      // Also update the patient profile status to ACTIVE
      await this.prisma.patientProfile.update({
        where: { id: updatedForm.episode.patientId },
        data: { status: 'ACTIVE' },
      });
    }

    // Create initial PatientPlan with selected exercises
    const patientPlan = await this.prisma.patientPlan.create({
      data: {
        patientId: updatedForm.episode.patientId,
        episodeId: form.episodeId,
        name: 'Initial Program',
        startDate: new Date(),
        isActive: true,
        activeExercises: initialProgram.exercises.map((ex, idx) => ({
          exerciseId: ex.exerciseId,
          orderIndex: ex.order ?? idx,
          customReps: ex.customReps,
          customSets: ex.customSets,
          customDuration: ex.customDuration,
          notes: ex.notes,
          addedAt: new Date().toISOString(),
        })) as any,
        customizations: {} as object, // Empty - deprecated field
      },
    });

    // Create first session with these exercises
    await this.prisma.session.create({
      data: {
        episodeId: form.episodeId,
        planId: patientPlan.id,
        scheduledDate: new Date(),
        status: 'SCHEDULED',
        sessionExercises: {
          create: initialProgram.exercises.map((ex, idx) => ({
            exerciseId: ex.exerciseId,
            orderIndex: ex.order || idx,
            customInstructions: ex.notes || null,
          })),
        },
      },
    });

    // Complete the baseline assessment milestone
    await this.milestonesService.completeBaselineAssessment(form.episodeId);

    return updatedForm;
  }

  async updateGoals(id: string, dto: UpdateGoalsDto, therapistId: string) {
    // Verify access
    const form = await this.findOne(id, therapistId);

    // Get existing therapyGoals or create empty object
    const existingGoals = (form.therapyGoals as Record<string, unknown>) || {};

    // Update goals while preserving other therapyGoals fields
    const updatedTherapyGoals = {
      ...existingGoals,
      goals: dto.goals.map((g) => ({
        description: g.description,
        targetValue: g.targetValue,
        targetDate: g.targetDate,
      })),
    };

    // Update form
    const updatedForm = await this.prisma.firstSessionForm.update({
      where: { id },
      data: {
        therapyGoals: updatedTherapyGoals as object,
      },
    });

    // Also update the ProgramEpisode goals if form is completed
    if (form.status === FirstSessionFormStatus.COMPLETED) {
      await this.prisma.programEpisode.update({
        where: { id: form.episodeId },
        data: {
          goals: updatedTherapyGoals as object,
        },
      });
    }

    return updatedForm;
  }

  async getPatientGoals(patientId: string, requesterId: string, requesterRoles: string[]) {
    // Find patient's episodes with completed first session forms
    const episodes = await this.prisma.programEpisode.findMany({
      where: {
        patientId,
        firstSessionForm: {
          status: FirstSessionFormStatus.COMPLETED,
        },
      },
      include: {
        firstSessionForm: true,
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    // Check authorization
    const isPatient = requesterRoles.includes('PATIENT');
    const isTherapist = requesterRoles.includes('THERAPIST') ||
                        requesterRoles.includes('LEAD_THERAPIST');

    if (isPatient) {
      // Patients can only see their own goals
      const patientProfile = await this.prisma.patientProfile.findFirst({
        where: { userId: requesterId },
      });

      if (!patientProfile || patientProfile.id !== patientId) {
        throw new ForbiddenException('You can only view your own goals');
      }
    } else if (isTherapist) {
      // Therapists can see goals for their patients
      const therapistProfile = await this.prisma.therapistProfile.findFirst({
        where: { userId: requesterId },
      });

      if (!therapistProfile) {
        throw new ForbiddenException('Therapist profile not found');
      }

      const hasAccess = episodes.some(
        (ep) => ep.therapistId === therapistProfile.id,
      );

      if (!hasAccess && episodes.length > 0) {
        throw new ForbiddenException(
          'You are not authorized to view this patient\'s goals',
        );
      }
    }

    // Extract goals from completed forms
    return episodes
      .filter((ep) => ep.firstSessionForm?.therapyGoals)
      .map((ep) => ({
        episodeId: ep.id,
        goals: ep.firstSessionForm?.therapyGoals,
        completedAt: ep.firstSessionForm?.completedAt,
      }));
  }
}
