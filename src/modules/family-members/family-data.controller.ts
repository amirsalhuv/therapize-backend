import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrismaService } from '../../database';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';
import { SessionFeedbackDto } from '../sessions/dto';

@ApiTags('family-data')
@Controller('api/v1/family')
export class FamilyDataController {
  constructor(private prisma: PrismaService) {}

  @Get('patient-data')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: 'Get linked patient profile and relationship info' })
  async getPatientData(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { id: familyMemberProfile.patientProfileId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        therapistRelationships: {
          where: { status: 'ACTIVE' },
          include: {
            therapist: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    return {
      patient: patientProfile,
      relationship: familyMemberProfile.relationship,
      canStartSessions: familyMemberProfile.canStartSessions,
    };
  }

  @Get('sessions/today')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: "Get today's session for the linked patient" })
  async getTodaySession(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    // Find active episode for the patient
    const episode = await this.prisma.programEpisode.findFirst({
      where: {
        patientId: familyMemberProfile.patientProfileId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!episode) {
      return { session: null, message: 'No active program' };
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const session = await this.prisma.session.findFirst({
      where: {
        episodeId: episode.id,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        sessionExercises: {
          include: {
            exercise: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        feedback: true,
        itemFeedbacks: true,
      },
    });

    return { session };
  }

  @Post('sessions/:id/start')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: 'Start a session for the linked patient' })
  async startSession(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    if (!familyMemberProfile.canStartSessions) {
      throw new ForbiddenException('You do not have permission to start sessions');
    }

    // Verify session belongs to the linked patient
    const session = await this.verifySessionAccess(sessionId, familyMemberProfile.patientProfileId);

    if (session.status !== 'SCHEDULED') {
      throw new ForbiddenException(`Session cannot be started - status is ${session.status}`);
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        startedByUserId: userId,
        startedByRole: 'FAMILY_MEMBER',
      },
      include: {
        sessionExercises: {
          include: { exercise: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  @Post('sessions/:id/complete')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: 'Complete a session for the linked patient' })
  async completeSession(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    if (!familyMemberProfile.canStartSessions) {
      throw new ForbiddenException('You do not have permission to complete sessions');
    }

    const session = await this.verifySessionAccess(sessionId, familyMemberProfile.patientProfileId);

    if (session.status !== 'IN_PROGRESS' && session.status !== 'PAUSED') {
      throw new ForbiddenException(`Session cannot be completed - status is ${session.status}`);
    }

    const completedAt = new Date();
    const durationMinutes = session.startedAt
      ? Math.round((completedAt.getTime() - session.startedAt.getTime()) / 60000)
      : null;

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt,
        durationMinutes,
      },
    });
  }

  @Post('sessions/:id/feedback')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: 'Submit session feedback for the linked patient' })
  async submitFeedback(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SessionFeedbackDto,
  ) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);
    await this.verifySessionAccess(sessionId, familyMemberProfile.patientProfileId);

    // Upsert feedback
    return this.prisma.sessionFeedback.upsert({
      where: { sessionId },
      create: {
        sessionId,
        overallRating: dto.overallRating,
        painNow: dto.painNow,
        fatigueNow: dto.fatigueNow,
        confidence: dto.confidence,
        newSymptoms: dto.newSymptoms,
        newSymptomsDetails: dto.newSymptomsDetails,
        questionnaireAnswers: dto.questionnaireAnswers,
        additionalNotes: dto.additionalNotes,
      },
      update: {
        overallRating: dto.overallRating,
        painNow: dto.painNow,
        fatigueNow: dto.fatigueNow,
        confidence: dto.confidence,
        newSymptoms: dto.newSymptoms,
        newSymptomsDetails: dto.newSymptomsDetails,
        questionnaireAnswers: dto.questionnaireAnswers,
        additionalNotes: dto.additionalNotes,
      },
    });
  }

  @Get('assessments')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: "Get patient's assessments" })
  async getAssessments(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    const episodes = await this.prisma.programEpisode.findMany({
      where: { patientId: familyMemberProfile.patientProfileId },
      select: { id: true },
    });

    const episodeIds = episodes.map((e) => e.id);

    return this.prisma.assessmentResult.findMany({
      where: { episodeId: { in: episodeIds } },
      include: {
        assessment: {
          select: {
            code: true,
            name: true,
            nameHe: true,
            description: true,
            descriptionHe: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  @Get('milestones')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: "Get patient's milestones" })
  async getMilestones(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    const episodes = await this.prisma.programEpisode.findMany({
      where: { patientId: familyMemberProfile.patientProfileId },
      select: { id: true },
    });

    const episodeIds = episodes.map((e) => e.id);

    return this.prisma.episodeMilestone.findMany({
      where: { episodeId: { in: episodeIds } },
      orderBy: [{ targetWeek: 'asc' }, { orderIndex: 'asc' }],
    });
  }

  @Get('therapy-goals')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: "Get patient's therapy goals" })
  async getTherapyGoals(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    const episodes = await this.prisma.programEpisode.findMany({
      where: { patientId: familyMemberProfile.patientProfileId },
      include: {
        firstSessionForm: {
          select: {
            therapyGoals: true,
          },
        },
      },
    });

    // Extract therapy goals from first session forms
    const goals = episodes
      .filter((e) => e.firstSessionForm?.therapyGoals)
      .map((e) => ({
        episodeId: e.id,
        goals: e.firstSessionForm!.therapyGoals,
        startDate: e.startDate,
      }));

    return goals;
  }

  @Get('documents')
  @ApiBearerAuth()
  @Roles(Role.FAMILY_MEMBER)
  @ApiOperation({ summary: "Get patient's medical documents" })
  async getDocuments(@CurrentUser('id') userId: string) {
    const familyMemberProfile = await this.getFamilyMemberProfile(userId);

    return this.prisma.medicalDocument.findMany({
      where: {
        patientId: familyMemberProfile.patientProfileId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async getFamilyMemberProfile(userId: string) {
    const profile = await this.prisma.familyMemberProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ForbiddenException('Family member profile not found');
    }

    return profile;
  }

  private async verifySessionAccess(sessionId: string, patientProfileId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        episode: {
          select: { patientId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.episode.patientId !== patientProfileId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    return session;
  }
}
