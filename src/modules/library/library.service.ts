import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { SearchLibraryDto } from './dto';
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
}
