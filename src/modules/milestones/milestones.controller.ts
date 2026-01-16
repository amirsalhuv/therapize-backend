import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CompleteMilestoneDto,
  MilestoneResponseDto,
  TimelineResponseDto,
} from './dto/milestone.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('episodes/:episodeId/milestones')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get milestones for an episode' })
  @ApiResponse({ status: 200, type: [MilestoneResponseDto] })
  async getEpisodeMilestones(@Param('episodeId') episodeId: string) {
    return this.milestonesService.getEpisodeMilestones(episodeId);
  }

  @Post('episodes/:episodeId/milestones')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Add a milestone to an episode' })
  @ApiResponse({ status: 201, type: MilestoneResponseDto })
  async createMilestone(
    @Param('episodeId') episodeId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.createMilestone(episodeId, dto);
  }

  @Patch('milestones/:id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  async updateMilestone(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.updateMilestone(id, dto);
  }

  @Delete('milestones/:id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a milestone' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  async deleteMilestone(@Param('id') id: string) {
    return this.milestonesService.deleteMilestone(id);
  }

  @Post('milestones/:id/complete')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Mark a milestone as completed' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  async completeMilestone(
    @Param('id') id: string,
    @Body() dto: CompleteMilestoneDto,
  ) {
    return this.milestonesService.completeMilestone(id, dto.linkedSessionId);
  }

  @Post('milestones/:id/skip')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Skip a milestone' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  async skipMilestone(@Param('id') id: string) {
    return this.milestonesService.skipMilestone(id);
  }

  @Post('episodes/:episodeId/milestones/reset')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Reset milestones to default templates' })
  @ApiResponse({ status: 200, type: [MilestoneResponseDto] })
  async resetMilestones(@Param('episodeId') episodeId: string) {
    return this.milestonesService.resetToDefaults(episodeId);
  }

  @Get('patients/me/timeline')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Get timeline for current patient' })
  @ApiResponse({ status: 200, type: TimelineResponseDto })
  async getMyTimeline(@CurrentUser() user: { id: string }) {
    return this.milestonesService.getPatientTimeline(user.id);
  }

  @Get('patients/:patientId/timeline')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get timeline for a specific patient' })
  @ApiResponse({ status: 200, type: TimelineResponseDto })
  async getPatientTimeline(@Param('patientId') patientId: string) {
    return this.milestonesService.getPatientTimeline(patientId);
  }
}
