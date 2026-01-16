import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, SessionFeedbackDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('api/v1/sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'List sessions' })
  findAll(
    @Query('episodeId') episodeId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.sessionsService.findAll(episodeId, +page, +limit);
  }

  @Get('today')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Get today session for patient' })
  getTodaySession(@CurrentUser('id') userId: string) {
    return this.sessionsService.getTodaySession(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Post()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Create session' })
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Post(':id/start')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Start session' })
  startSession(@Param('id') id: string) {
    return this.sessionsService.startSession(id);
  }

  @Post(':id/pause')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Pause session' })
  pauseSession(@Param('id') id: string) {
    return this.sessionsService.pauseSession(id);
  }

  @Post(':id/resume')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Resume paused session' })
  resumeSession(@Param('id') id: string) {
    return this.sessionsService.resumeSession(id);
  }

  @Post(':id/stop')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Stop session and save progress' })
  stopSession(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.sessionsService.stopSession(id, body.reason);
  }

  @Post(':id/complete')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Complete session' })
  completeSession(@Param('id') id: string) {
    return this.sessionsService.completeSession(id);
  }

  @Post(':id/feedback')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Submit session feedback' })
  submitFeedback(@Param('id') id: string, @Body() dto: SessionFeedbackDto) {
    return this.sessionsService.submitFeedback(id, dto);
  }

  @Get(':id/feedback')
  @ApiOperation({ summary: 'Get session feedback' })
  getFeedback(@Param('id') id: string) {
    return this.sessionsService.getFeedback(id);
  }
}
