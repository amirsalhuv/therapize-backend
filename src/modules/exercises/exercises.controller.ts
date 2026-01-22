import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, UpdateExerciseDto, SearchExercisesDto } from './dto';
import type { Locale } from '../../i18n';

@ApiTags('Exercises')
@Controller('api/v1/exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new exercise' })
  create(@Body() dto: CreateExerciseDto, @Request() req: any) {
    return this.exercisesService.create(dto, req.user.therapistProfile?.id);
  }

  @Get()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'List exercises with filters' })
  @ApiQuery({ name: 'locale', required: false, enum: ['EN', 'HE'] })
  findAll(
    @Query() dto: SearchExercisesDto,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('locale') locale?: Locale,
  ) {
    const lang = locale || (acceptLanguage?.includes('he') ? 'HE' : 'EN');
    return this.exercisesService.findAll(dto, lang as Locale);
  }

  @Get('categories')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get all exercise categories' })
  getCategories() {
    return this.exercisesService.getCategories();
  }

  @Get('body-parts')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get all body parts' })
  getBodyParts() {
    return this.exercisesService.getBodyParts();
  }

  @Get(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'Get a single exercise by ID' })
  @ApiQuery({ name: 'locale', required: false, enum: ['EN', 'HE'] })
  findOne(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('locale') locale?: Locale,
  ) {
    const lang = locale || (acceptLanguage?.includes('he') ? 'HE' : 'EN');
    return this.exercisesService.findOne(id, lang as Locale);
  }

  @Patch(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Update an exercise' })
  update(@Param('id') id: string, @Body() dto: UpdateExerciseDto, @Request() req: any) {
    return this.exercisesService.update(id, dto, req.user.therapistProfile?.id);
  }

  @Delete(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Soft delete an exercise' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.exercisesService.remove(id, req.user.therapistProfile?.id);
  }
}
