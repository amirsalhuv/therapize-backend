import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './dto';
import { ClinicalNoteType } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNoteDto, therapistId: string) {
    // Verify therapist has access to this episode
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: dto.episodeId },
    });

    if (!episode) {
      throw new NotFoundException('Episode not found');
    }

    if (episode.therapistId !== therapistId) {
      throw new ForbiddenException('You do not have access to this episode');
    }

    return this.prisma.clinicalNote.create({
      data: {
        episodeId: dto.episodeId,
        therapistId,
        title: dto.title,
        content: dto.content,
        noteType: (dto.noteType as ClinicalNoteType) || ClinicalNoteType.GENERAL,
      },
    });
  }

  async findByEpisode(episodeId: string, therapistId: string) {
    // Verify therapist has access to this episode
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      throw new NotFoundException('Episode not found');
    }

    if (episode.therapistId !== therapistId) {
      throw new ForbiddenException('You do not have access to this episode');
    }

    return this.prisma.clinicalNote.findMany({
      where: {
        episodeId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, therapistId: string) {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id },
      include: { episode: true },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException('Note not found');
    }

    if (note.episode.therapistId !== therapistId) {
      throw new ForbiddenException('You do not have access to this note');
    }

    return note;
  }

  async update(id: string, dto: UpdateNoteDto, therapistId: string) {
    // Verify access
    await this.findOne(id, therapistId);

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.noteType !== undefined) updateData.noteType = dto.noteType;

    return this.prisma.clinicalNote.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, therapistId: string) {
    // Verify access
    await this.findOne(id, therapistId);

    // Soft delete
    return this.prisma.clinicalNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
