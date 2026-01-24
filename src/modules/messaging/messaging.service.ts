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
    let thread = await this.prisma.groupThread.findUnique({
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

    // If thread doesn't exist, create it with the episode participants
    if (!thread) {
      thread = await this.createThreadForEpisode(episodeId);
    }

    await this.verifyParticipant(thread.id, userId);
    return thread;
  }

  private async createThreadForEpisode(episodeId: string) {
    // Get episode with patient and therapist info
    const episode = await this.prisma.programEpisode.findUnique({
      where: { id: episodeId },
      include: {
        patient: { include: { user: true } },
        therapist: { include: { user: true } },
      },
    });

    if (!episode || !episode.patient.user || !episode.therapist.user) {
      throw new NotFoundException('Episode or users not found');
    }

    const patientUser = episode.patient.user;
    const therapistUser = episode.therapist.user;

    // Create thread with participants
    return this.prisma.groupThread.create({
      data: {
        episodeId,
        isGroup: true,
        name: `Care Team - ${patientUser.firstName} ${patientUser.lastName}`,
        participants: {
          create: [
            { userId: patientUser.id, role: 'member' },
            { userId: therapistUser.id, role: 'admin' },
          ],
        },
      },
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
  }

  async markAsRead(threadId: string, userId: string) {
    await this.verifyParticipant(threadId, userId);

    return this.prisma.groupThreadParticipant.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    // Get all threads the user is a participant of
    const participants = await this.prisma.groupThreadParticipant.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: {
        threadId: true,
        lastReadAt: true,
      },
    });

    if (participants.length === 0) {
      return { unreadCount: 0 };
    }

    // Count unread messages across all threads
    let totalUnread = 0;

    for (const participant of participants) {
      const count = await this.prisma.message.count({
        where: {
          threadId: participant.threadId,
          senderId: { not: userId },
          deletedAt: null,
          createdAt: participant.lastReadAt
            ? { gt: participant.lastReadAt }
            : undefined,
        },
      });
      totalUnread += count;
    }

    return { unreadCount: totalUnread };
  }

  async getUnreadCountsByEpisode(userId: string) {
    // Get all threads the user is a participant of with episode info
    const participants = await this.prisma.groupThreadParticipant.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: {
        threadId: true,
        lastReadAt: true,
        thread: {
          select: {
            episodeId: true,
          },
        },
      },
    });

    if (participants.length === 0) {
      return { unreadByEpisode: {} };
    }

    // Count unread messages per episode
    const unreadByEpisode: Record<string, number> = {};

    for (const participant of participants) {
      const episodeId = participant.thread.episodeId;
      if (!episodeId) continue;

      const count = await this.prisma.message.count({
        where: {
          threadId: participant.threadId,
          senderId: { not: userId },
          deletedAt: null,
          createdAt: participant.lastReadAt
            ? { gt: participant.lastReadAt }
            : undefined,
        },
      });

      if (count > 0) {
        unreadByEpisode[episodeId] = count;
      }
    }

    return { unreadByEpisode };
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
