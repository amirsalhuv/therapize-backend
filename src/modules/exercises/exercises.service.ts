import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { I18nService, Locale } from '../../i18n';
import { CreateExerciseDto, UpdateExerciseDto, SearchExercisesDto } from './dto';
import { Prisma } from '@prisma/client';
import { CATEGORIES } from '../../common/constants/therapy-reference';

@Injectable()
export class ExercisesService {
  constructor(
    private prisma: PrismaService,
    private i18n: I18nService,
  ) {}

  private async checkNameUniqueness(
    name: string,
    isLibraryExercise: boolean,
    createdById: string,
  ): Promise<void> {
    if (isLibraryExercise) {
      // Public exercise: check against all public exercises
      const existingPublic = await this.prisma.exercise.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          isLibraryExercise: true,
          isDeleted: false,
        },
      });

      if (existingPublic) {
        throw new BadRequestException(
          `A public exercise with the name "${name}" already exists. Please choose a different name.`,
        );
      }
    } else {
      // Private exercise: check only creator's private exercises
      const existingPrivate = await this.prisma.exercise.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          isLibraryExercise: false,
          createdById: createdById,
          isDeleted: false,
        },
      });

      if (existingPrivate) {
        throw new BadRequestException(
          `You already have a private exercise named "${name}". Please choose a different name.`,
        );
      }
    }
  }

  async create(dto: CreateExerciseDto, createdById: string) {
    // Validate category if provided
    if (dto.category) {
      const validCategories = CATEGORIES.map((c) => c.en);
      if (!validCategories.includes(dto.category)) {
        throw new BadRequestException(
          `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        );
      }
    }

    // Check name uniqueness
    const isLibraryExercise = dto.isLibraryExercise ?? true;
    await this.checkNameUniqueness(dto.name, isLibraryExercise, createdById);

    return this.prisma.exercise.create({
      data: {
        ...dto,
        bodyParts: dto.bodyParts || [],
        isLibraryExercise,
        createdById,
      },
    });
  }

  async findAll(dto: SearchExercisesDto, locale: Locale = 'EN') {
    const { query, category, bodyParts, difficulty, libraryOnly, createdById, page = 1, limit = 20 } = dto;

    console.log('[ExercisesService.findAll] Received DTO:', { libraryOnly, createdById, page, limit });

    const where: Prisma.ExerciseWhereInput = {
      isDeleted: false,
    };

    if (libraryOnly !== undefined) {
      console.log('[ExercisesService.findAll] Setting isLibraryExercise =', libraryOnly);
      where.isLibraryExercise = libraryOnly;
    }

    if (createdById) {
      console.log('[ExercisesService.findAll] Setting createdById =', createdById);
      where.createdById = createdById;
    }

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (bodyParts?.length) {
      where.bodyParts = { hasSome: bodyParts };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { nameHe: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { descriptionHe: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    console.log('[ExercisesService.findAll] Final where clause:', JSON.stringify(where));

    const [exercises, total] = await Promise.all([
      this.prisma.exercise.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exercise.count({ where }),
    ]);

    console.log(`[ExercisesService.findAll] Found ${exercises.length} exercises:`, exercises.map(e => ({ name: e.name, isLibraryExercise: e.isLibraryExercise, createdById: e.createdById })));

    return {
      exercises: exercises.map((ex) => this.localizeExercise(ex, locale)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, locale: Locale = 'EN') {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id, isDeleted: false },
    });

    if (!exercise) {
      throw new NotFoundException(this.i18n.translate('errors.exerciseNotFound', locale));
    }

    return this.localizeExercise(exercise, locale);
  }

  async update(id: string, dto: UpdateExerciseDto, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id, isDeleted: false },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Only the creator or admin can update
    if (exercise.createdById && exercise.createdById !== userId) {
      throw new ForbiddenException('You can only update exercises you created');
    }

    return this.prisma.exercise.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id, isDeleted: false },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Only the creator or admin can delete
    if (exercise.createdById && exercise.createdById !== userId) {
      throw new ForbiddenException('You can only delete exercises you created');
    }

    // Soft delete
    return this.prisma.exercise.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getCategories() {
    const categories = await this.prisma.exercise.findMany({
      where: { isDeleted: false, isLibraryExercise: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category).filter(Boolean);
  }

  async getBodyParts() {
    const exercises = await this.prisma.exercise.findMany({
      where: { isDeleted: false, isLibraryExercise: true },
      select: { bodyParts: true },
    });

    const allBodyParts = exercises.flatMap((e) => e.bodyParts);
    return [...new Set(allBodyParts)].sort();
  }

  private localizeExercise(exercise: any, locale: Locale) {
    return {
      ...exercise,
      name: this.i18n.localizeField(exercise, 'name', locale),
      description: this.i18n.localizeField(exercise, 'description', locale),
      instructions: this.i18n.localizeField(exercise, 'instructions', locale),
      purpose: this.i18n.localizeField(exercise, 'purpose', locale),
    };
  }
}
