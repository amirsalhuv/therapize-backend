import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { SearchLibraryDto, CreateStageDto, UpdateStageDto, AddExerciseToStageDto, UpdateStageExerciseDto, ReorderStagesDto } from './dto';
import { Prisma } from '@prisma/client';
import { BODY_PARTS, CONDITIONS, CATEGORIES, BilingualItem } from '../../common/constants';
import { I18nService, Locale } from '../../i18n';

@Injectable()
export class LibraryService {
  constructor(
    private prisma: PrismaService,
    private i18n: I18nService,
  ) {}

  private localizeItems(items: BilingualItem[], locale: Locale): string[] {
    const lang = locale === 'HE' ? 'he' : 'en';
    return items.map((item) => item[lang]);
  }

  async searchTemplates(dto: SearchLibraryDto, locale: Locale = 'EN') {
    const { query, category, conditions, bodyParts, page = 1, limit = 20 } = dto;

    const where: Prisma.ProgramTemplateWhereInput = {
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    if (conditions?.length) {
      where.targetConditions = { hasSome: conditions };
    }

    if (bodyParts?.length) {
      where.bodyParts = { hasSome: bodyParts };
    }

    if (query) {
      const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { nameHe: { contains: query, mode: 'insensitive' } },
        { descriptionHe: { contains: query, mode: 'insensitive' } },
        ...searchTerms.map((term) => ({
          targetConditions: { has: term },
        })),
        ...searchTerms.map((term) => ({
          bodyParts: { has: term },
        })),
        ...searchTerms.map((term) => ({
          searchTags: { has: term },
        })),
      ];
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.prisma.programTemplate.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          _count: { select: { patientPlans: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.programTemplate.count({ where }),
    ]);

    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: this.i18n.localizeField(t, 'name', locale),
        description: this.i18n.localizeField(t, 'description', locale),
        durationWeeks: t.durationWeeks,
        category: t.category,
        targetConditions: t.targetConditions,
        bodyParts: t.bodyParts,
        usageCount: t._count.patientPlans,
        createdBy: {
          firstName: t.createdBy.user.firstName,
          lastName: t.createdBy.user.lastName,
        },
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getTemplate(id: string, locale: Locale = 'EN') {
    const template = await this.prisma.programTemplate.findUnique({
      where: { id, isPublished: true },
      include: {
        createdBy: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        exercises: true,
        _count: { select: { patientPlans: true } },
      },
    });

    if (!template) {
      throw new NotFoundException(this.i18n.translate('errors.templateNotFound', locale));
    }

    return {
      id: template.id,
      name: this.i18n.localizeField(template, 'name', locale),
      description: this.i18n.localizeField(template, 'description', locale),
      durationWeeks: template.durationWeeks,
      category: template.category,
      targetConditions: template.targetConditions,
      bodyParts: template.bodyParts,
      structure: template.structure,
      exercises: template.exercises.map((ex) => ({
        ...ex,
        name: this.i18n.localizeField(ex, 'name', locale),
        description: this.i18n.localizeField(ex, 'description', locale),
        instructions: this.i18n.localizeField(ex, 'instructions', locale),
      })),
      usageCount: template._count.patientPlans,
      createdBy: {
        firstName: template.createdBy.user.firstName,
        lastName: template.createdBy.user.lastName,
      },
      createdAt: template.createdAt,
    };
  }

  async selectTemplate(templateId: string, therapistId: string) {
    const template = await this.prisma.programTemplate.findUnique({
      where: { id: templateId, isPublished: true },
      include: { exercises: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Create a copy of the template for the therapist
    const copy = await this.prisma.programTemplate.create({
      data: {
        name: `${template.name} (Copy)`,
        nameHe: template.nameHe ? `${template.nameHe} (העתק)` : null,
        description: template.description,
        descriptionHe: template.descriptionHe,
        durationWeeks: template.durationWeeks,
        category: template.category,
        targetConditions: template.targetConditions,
        bodyParts: template.bodyParts,
        searchTags: template.searchTags,
        structure: template.structure as Prisma.JsonObject,
        isPublished: false,
        createdById: therapistId,
      },
    });

    // Copy exercises if any
    if (template.exercises.length > 0) {
      await this.prisma.exercise.createMany({
        data: template.exercises.map((ex) => ({
          templateId: copy.id,
          name: ex.name,
          nameHe: ex.nameHe,
          description: ex.description,
          descriptionHe: ex.descriptionHe,
          instructions: ex.instructions,
          instructionsHe: ex.instructionsHe,
          mediaUrl: ex.mediaUrl,
          mediaType: ex.mediaType,
          durationMinutes: ex.durationMinutes,
          repetitions: ex.repetitions,
          sets: ex.sets,
          category: ex.category,
          difficulty: ex.difficulty,
        })),
      });
    }

    return copy;
  }

  getCategories(locale: Locale = 'EN') {
    return this.localizeItems(CATEGORIES, locale);
  }

  getConditions(locale: Locale = 'EN') {
    return this.localizeItems(CONDITIONS, locale);
  }

  getBodyParts(locale: Locale = 'EN') {
    return this.localizeItems(BODY_PARTS, locale);
  }

  // ============================================
  // STAGE MANAGEMENT
  // ============================================

  async getProgramStages(programId: string, locale: Locale = 'EN') {
    const stages = await this.prisma.sessionStageTemplate.findMany({
      where: { templateId: programId },
      include: {
        stageExercises: {
          include: { exercise: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return stages.map((stage) => ({
      id: stage.id,
      type: stage.type,
      name: this.i18n.localizeField(stage, 'name', locale),
      description: this.i18n.localizeField(stage, 'description', locale),
      orderIndex: stage.orderIndex,
      durationMinutes: stage.durationMinutes,
      exercises: stage.stageExercises.map((se) => ({
        id: se.id,
        exerciseId: se.exerciseId,
        orderIndex: se.orderIndex,
        customReps: se.customReps,
        customSets: se.customSets,
        customDuration: se.customDuration,
        notes: this.i18n.localizeField(se, 'notes', locale),
        exercise: {
          ...se.exercise,
          name: this.i18n.localizeField(se.exercise, 'name', locale),
          description: this.i18n.localizeField(se.exercise, 'description', locale),
          instructions: this.i18n.localizeField(se.exercise, 'instructions', locale),
        },
      })),
    }));
  }

  async createStage(programId: string, dto: CreateStageDto, therapistId: string) {
    const program = await this.prisma.programTemplate.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (program.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    return this.prisma.sessionStageTemplate.create({
      data: {
        templateId: programId,
        type: dto.type,
        name: dto.name,
        nameHe: dto.nameHe,
        description: dto.description,
        descriptionHe: dto.descriptionHe,
        orderIndex: dto.orderIndex,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async updateStage(programId: string, stageId: string, dto: UpdateStageDto, therapistId: string) {
    const stage = await this.prisma.sessionStageTemplate.findFirst({
      where: { id: stageId, templateId: programId },
      include: { template: true },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.template.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    return this.prisma.sessionStageTemplate.update({
      where: { id: stageId },
      data: dto,
    });
  }

  async deleteStage(programId: string, stageId: string, therapistId: string) {
    const stage = await this.prisma.sessionStageTemplate.findFirst({
      where: { id: stageId, templateId: programId },
      include: { template: true },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.template.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    return this.prisma.sessionStageTemplate.delete({
      where: { id: stageId },
    });
  }

  async reorderStages(programId: string, dto: ReorderStagesDto, therapistId: string) {
    const program = await this.prisma.programTemplate.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (program.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    // Update each stage's orderIndex based on position in array
    await Promise.all(
      dto.stageIds.map((stageId, index) =>
        this.prisma.sessionStageTemplate.update({
          where: { id: stageId },
          data: { orderIndex: index },
        }),
      ),
    );

    return this.getProgramStages(programId);
  }

  // ============================================
  // STAGE EXERCISE MANAGEMENT
  // ============================================

  async addExerciseToStage(programId: string, stageId: string, dto: AddExerciseToStageDto, therapistId: string) {
    const stage = await this.prisma.sessionStageTemplate.findFirst({
      where: { id: stageId, templateId: programId },
      include: { template: true },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.template.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    // Check if exercise exists
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: dto.exerciseId, isDeleted: false },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return this.prisma.stageExercise.create({
      data: {
        stageId,
        exerciseId: dto.exerciseId,
        orderIndex: dto.orderIndex,
        customReps: dto.customReps,
        customSets: dto.customSets,
        customDuration: dto.customDuration,
        notes: dto.notes,
        notesHe: dto.notesHe,
      },
      include: { exercise: true },
    });
  }

  async updateStageExercise(
    programId: string,
    stageId: string,
    stageExerciseId: string,
    dto: UpdateStageExerciseDto,
    therapistId: string,
  ) {
    const stageExercise = await this.prisma.stageExercise.findFirst({
      where: { id: stageExerciseId, stageId },
      include: { stage: { include: { template: true } } },
    });

    if (!stageExercise) {
      throw new NotFoundException('Stage exercise not found');
    }

    if (stageExercise.stage.template.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    return this.prisma.stageExercise.update({
      where: { id: stageExerciseId },
      data: dto,
      include: { exercise: true },
    });
  }

  async removeExerciseFromStage(programId: string, stageId: string, stageExerciseId: string, therapistId: string) {
    const stageExercise = await this.prisma.stageExercise.findFirst({
      where: { id: stageExerciseId, stageId },
      include: { stage: { include: { template: true } } },
    });

    if (!stageExercise) {
      throw new NotFoundException('Stage exercise not found');
    }

    if (stageExercise.stage.template.createdById !== therapistId) {
      throw new ForbiddenException('You can only modify your own programs');
    }

    return this.prisma.stageExercise.delete({
      where: { id: stageExerciseId },
    });
  }
}
