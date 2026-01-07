import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TherapistsService } from './therapists.service';
import { CreateTherapistProfileDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('therapists')
@ApiBearerAuth()
@Controller('api/v1/therapists')
export class TherapistsController {
  constructor(private therapistsService: TherapistsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.OWNER, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'List therapists' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.therapistsService.findAll(+page, +limit);
  }

  @Get('me')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get own therapist profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.therapistsService.findByUserId(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OWNER, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get therapist by ID' })
  findOne(@Param('id') id: string) {
    return this.therapistsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Create therapist profile' })
  create(@Body() dto: CreateTherapistProfileDto & { userId: string }) {
    return this.therapistsService.create(dto.userId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Update therapist profile' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTherapistProfileDto>) {
    return this.therapistsService.update(id, dto);
  }

  @Get(':id/patients')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get therapist patients' })
  getPatients(@Param('id') id: string) {
    return this.therapistsService.getPatients(id);
  }

  @Get(':id/episodes')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get therapist episodes' })
  getEpisodes(@Param('id') id: string) {
    return this.therapistsService.getEpisodes(id);
  }

  @Get(':id/programs')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get therapist program templates' })
  getPrograms(@Param('id') id: string) {
    return this.therapistsService.getPrograms(id);
  }
}
