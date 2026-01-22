import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientPlansService } from './patient-plans.service';
import { UpdateActiveExercisesDto } from './dto/update-active-exercises.dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('patient-plans')
@Controller('patient-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientPlansController {
  constructor(private readonly patientPlansService: PatientPlansService) {}

  @Get('by-episode/:episodeId')
  @ApiOperation({ summary: 'Get active patient plan by episode ID' })
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  async getActivePlanByEpisode(@Param('episodeId') episodeId: string) {
    return this.patientPlansService.getActivePlanByEpisode(episodeId);
  }

  @Get(':planId/exercises')
  @ApiOperation({ summary: 'Get active exercises for a patient plan' })
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  async getActiveExercises(@Param('planId') planId: string) {
    return this.patientPlansService.getActiveExercises(planId);
  }

  @Patch(':planId/exercises')
  @ApiOperation({ summary: 'Update active exercises for a patient plan' })
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  async updateActiveExercises(
    @Param('planId') planId: string,
    @Body() updateDto: UpdateActiveExercisesDto,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.patientPlansService.updateActiveExercises(
      planId,
      updateDto,
      user.therapistProfileId,
    );
  }
}
