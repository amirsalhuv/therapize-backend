import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientRelationshipsService } from './patient-relationships.service';
import { SelectProgramsDto, ScheduleFirstMeetingDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('patient-relationships')
@ApiBearerAuth()
@Controller('api/v1/patient-relationships')
export class PatientRelationshipsController {
  constructor(private relationshipsService: PatientRelationshipsService) {}

  @Get(':id')
  @Roles(Role.PATIENT, Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get relationship by ID' })
  findOne(@Param('id') id: string) {
    return this.relationshipsService.findOne(id);
  }

  @Post(':id/complete-payment')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Complete payment for a relationship (transitions to PENDING_SCHEDULING)' })
  completePayment(@Param('id') id: string) {
    return this.relationshipsService.completePayment(id);
  }

  @Post(':id/schedule')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Schedule first meeting (transitions to SCHEDULED_FIRST_MEETING)' })
  scheduleFirstMeeting(
    @Param('id') id: string,
    @Body() dto: ScheduleFirstMeetingDto,
  ) {
    return this.relationshipsService.scheduleFirstMeeting(id, new Date(dto.scheduledAt));
  }

  @Post(':id/reschedule')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Reschedule first meeting (updates scheduledAt)' })
  rescheduleFirstMeeting(
    @Param('id') id: string,
    @Body() dto: ScheduleFirstMeetingDto,
  ) {
    return this.relationshipsService.rescheduleFirstMeeting(id, new Date(dto.scheduledAt));
  }
}
