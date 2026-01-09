import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FirstSessionFormsService } from './first-session-forms.service';
import {
  CreateFirstSessionFormDto,
  UpdateFirstSessionFormDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('first-session-forms')
@ApiBearerAuth()
@Controller('api/v1/first-session-forms')
export class FirstSessionFormsController {
  constructor(private readonly service: FirstSessionFormsService) {}

  @Post()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Create a first session form for an episode' })
  @ApiResponse({ status: 201, description: 'Form created successfully' })
  @ApiResponse({ status: 400, description: 'Form already exists for episode' })
  @ApiResponse({ status: 403, description: 'Not authorized for this episode' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  create(
    @Body() dto: CreateFirstSessionFormDto,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.create(dto, user.therapistProfileId);
  }

  @Get('episode/:episodeId')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get first session form by episode ID' })
  @ApiResponse({ status: 200, description: 'Form found' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  findByEpisode(
    @Param('episodeId', ParseUUIDPipe) episodeId: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.findByEpisodeId(episodeId, user.therapistProfileId);
  }

  @Get(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get first session form by ID' })
  @ApiResponse({ status: 200, description: 'Form found' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.findOne(id, user.therapistProfileId);
  }

  @Patch(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Update first session form (save draft)' })
  @ApiResponse({ status: 200, description: 'Form updated' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFirstSessionFormDto,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.update(id, dto, user.therapistProfileId);
  }

  @Post(':id/complete')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Mark first session form as completed' })
  @ApiResponse({ status: 200, description: 'Form completed' })
  @ApiResponse({ status: 400, description: 'Required fields missing' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.complete(id, user.therapistProfileId);
  }

  @Get('patient/:patientId/goals')
  @Roles(Role.PATIENT, Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get patient therapy goals from completed forms' })
  @ApiResponse({ status: 200, description: 'Goals returned' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  getPatientGoals(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: { id: string; roles: string[] },
  ) {
    return this.service.getPatientGoals(patientId, user.id, user.roles);
  }
}
