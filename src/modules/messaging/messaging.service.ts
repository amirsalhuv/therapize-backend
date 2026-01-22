import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreateMessageDto, GetMessagesQueryDto } from './dto';
import { MessageContentType } from '@prisma/client';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getThreadMessages(threadId: string, userId: string, query: GetMessagesQueryDto) {
    // Verify user is participant
    await this.verifyParticipant(threadId, userId);

    const { limit = 50, cursor } = query;

    const messages = await this.prisma.message.findMany({
      where: {
        threadId,
        deletedAt: null,
      },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const nextCursor = messages.length === limit ? messages[messages.length - 1]?.id : null;

    return {
      messages: messages.reverse(),
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  async createMessage(senderId: string, dto: CreateMessageDto) {
    // Verify sender is participant
    await this.verifyParticipant(dto.threadId, senderId);

    const message = await this.prisma.message.create({
      data: {
        threadId: dto.threadId,
        senderId,
        content: dto.content,
        contentType: dto.contentType || MessageContentType.TEXT,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSizeBytes: dto.fileSizeBytes,
        mimeType: dto.mimeType,
        thumbnailUrl: dto.thumbnailUrl,
        durationSeconds: dto.durationSeconds,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update participant's lastReadAt
    await this.prisma.groupThreadParticipant.updateMany({
      where: { threadId: dto.threadId, userId: senderId },
      data: { lastReadAt: new Date() },
    });

    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender can delete their own message
    if (message.senderId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s message');
    }

    // Soft delete
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  async getThread(threadId: string, userId: string) {
    await this.verifyParticipant(threadId, userId);

    return this.prisma.groupThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                roles: true,
              },
            },
          },
        },
        episode: {
          include: {
            patient: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async getThreadForEpisode(episodeId: string, userId: string) {
    const thread = await this.prisma.groupThread.findUnique({
      where: { episodeId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                roles: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found for this episode');
    }

    await this.verifyParticipant(thread.id, userId);
    return thread;
  }

  async markAsRead(threadId: string, userId: string) {
    await this.verifyParticipant(threadId, userId);

    return this.prisma.groupThreadParticipant.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  private async verifyParticipant(threadId: string, userId: string) {
    const participant = await this.prisma.groupThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException('Not a participant of this thread');
    }

    return participant;
  }
}
