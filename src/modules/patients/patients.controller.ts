import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientProfileDto, UpdatePatientProfileDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('api/v1/patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'List patients' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.patientsService.findAll(+page, +limit);
  }

  @Get('me')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Get own patient profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.patientsService.findByUserId(userId);
  }

  @Get(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Get patient by ID' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Create patient profile' })
  create(@Body() dto: CreatePatientProfileDto & { userId: string }) {
    return this.patientsService.create(dto.userId, dto);
  }

  @Patch(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Update patient profile' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientProfileDto) {
    return this.patientsService.update(id, dto);
  }

  @Get(':id/episodes')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get patient episodes' })
  getEpisodes(@Param('id') id: string) {
    return this.patientsService.getEpisodes(id);
  }

  @Get(':id/documents')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get patient documents' })
  getDocuments(@Param('id') id: string) {
    return this.patientsService.getDocuments(id);
  }

  @Get(':id/sessions')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get patient sessions' })
  getSessions(@Param('id') id: string, @Query('limit') limit = 10) {
    return this.patientsService.getSessions(id, +limit);
  }
}
