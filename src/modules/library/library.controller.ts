import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { Public } from '../../common/decorators';
import { LibraryService } from './library.service';
import { SearchLibraryDto, CreateStageDto, UpdateStageDto, AddExerciseToStageDto, UpdateStageExerciseDto, ReorderStagesDto } from './dto';
import { CurrentLocale } from '../../i18n';
import type { Locale } from '../../i18n';

@ApiTags('Library')
@Controller('api/v1/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Public()
  @Get('templates')
  @ApiOperation({ summary: 'Search and filter program templates' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  searchTemplates(
    @Query() dto: SearchLibraryDto,
    @CurrentLocale() locale: Locale,
  ) {
    return this.libraryService.searchTemplates(dto, locale);
  }

  @Public()
  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific program template' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getTemplate(
    @Param('id') id: string,
    @CurrentLocale() locale: Locale,
  ) {
    return this.libraryService.getTemplate(id, locale);
  }

  @Post('templates/:id/select')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select a template to create a copy for customization' })
  async selectTemplate(@Param('id') id: string, @Request() req: any) {
    const therapistId = req.user.therapistProfileId;
    return this.libraryService.selectTemplate(id, therapistId);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get available program categories' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getCategories(@CurrentLocale() locale: Locale) {
    return this.libraryService.getCategories(locale);
  }

  @Public()
  @Get('conditions')
  @ApiOperation({ summary: 'Get available target conditions' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getConditions(@CurrentLocale() locale: Locale) {
    return this.libraryService.getConditions(locale);
  }

  @Public()
  @Get('body-parts')
  @ApiOperation({ summary: 'Get available body parts' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getBodyParts(@CurrentLocale() locale: Locale) {
    return this.libraryService.getBodyParts(locale);
  }

  // ============================================
  // STAGE MANAGEMENT ENDPOINTS
  // ============================================

  @Get('programs/:programId/stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stages for a program' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getProgramStages(@Param('programId') programId: string, @CurrentLocale() locale: Locale) {
    return this.libraryService.getProgramStages(programId, locale);
  }

  @Post('programs/:programId/stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stage in a program' })
  createStage(@Param('programId') programId: string, @Body() dto: CreateStageDto, @Request() req: any) {
    return this.libraryService.createStage(programId, dto, req.user.therapistProfile?.id);
  }

  @Patch('programs/:programId/stages/:stageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stage' })
  updateStage(
    @Param('programId') programId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @Request() req: any,
  ) {
    return this.libraryService.updateStage(programId, stageId, dto, req.user.therapistProfile?.id);
  }

  @Delete('programs/:programId/stages/:stageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a stage' })
  deleteStage(@Param('programId') programId: string, @Param('stageId') stageId: string, @Request() req: any) {
    return this.libraryService.deleteStage(programId, stageId, req.user.therapistProfile?.id);
  }

  @Post('programs/:programId/stages/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder stages in a program' })
  reorderStages(@Param('programId') programId: string, @Body() dto: ReorderStagesDto, @Request() req: any) {
    return this.libraryService.reorderStages(programId, dto, req.user.therapistProfile?.id);
  }

  // ============================================
  // STAGE EXERCISE MANAGEMENT ENDPOINTS
  // ============================================

  @Post('programs/:programId/stages/:stageId/exercises')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an exercise to a stage' })
  addExerciseToStage(
    @Param('programId') programId: string,
    @Param('stageId') stageId: string,
    @Body() dto: AddExerciseToStageDto,
    @Request() req: any,
  ) {
    return this.libraryService.addExerciseToStage(programId, stageId, dto, req.user.therapistProfile?.id);
  }

  @Patch('programs/:programId/stages/:stageId/exercises/:stageExerciseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an exercise in a stage' })
  updateStageExercise(
    @Param('programId') programId: string,
    @Param('stageId') stageId: string,
    @Param('stageExerciseId') stageExerciseId: string,
    @Body() dto: UpdateStageExerciseDto,
    @Request() req: any,
  ) {
    return this.libraryService.updateStageExercise(programId, stageId, stageExerciseId, dto, req.user.therapistProfile?.id);
  }

  @Delete('programs/:programId/stages/:stageId/exercises/:stageExerciseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an exercise from a stage' })
  removeExerciseFromStage(
    @Param('programId') programId: string,
    @Param('stageId') stageId: string,
    @Param('stageExerciseId') stageExerciseId: string,
    @Request() req: any,
  ) {
    return this.libraryService.removeExerciseFromStage(programId, stageId, stageExerciseId, req.user.therapistProfile?.id);
  }
}
