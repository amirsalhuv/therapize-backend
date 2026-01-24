import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { CreateMessageDto, GetMessagesQueryDto } from './dto';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller('api/v1/threads')
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private messagingGateway: MessagingGateway,
  ) {}

  @Get(':threadId/messages')
  @ApiOperation({ summary: 'Get paginated messages for a thread' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Param('threadId') threadId: string,
    @Query() query: GetMessagesQueryDto,
    @Request() req,
  ) {
    return this.messagingService.getThreadMessages(threadId, req.user.id, query);
  }

  @Post(':threadId/messages')
  @ApiOperation({ summary: 'Send a message to a thread (REST fallback)' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: Omit<CreateMessageDto, 'threadId'>,
    @Request() req,
  ) {
    const message = await this.messagingService.createMessage(req.user.id, {
      ...dto,
      threadId,
    });

    // Broadcast to all WebSocket clients in the thread room
    this.messagingGateway.server.to(`thread:${threadId}`).emit('newMessage', message);

    return message;
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Soft delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    return this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @Get(':threadId')
  @ApiOperation({ summary: 'Get thread details with participants' })
  @ApiResponse({ status: 200, description: 'Thread retrieved successfully' })
  async getThread(@Param('threadId') threadId: string, @Request() req) {
    return this.messagingService.getThread(threadId, req.user.id);
  }

  @Get('episode/:episodeId')
  @ApiOperation({ summary: 'Get thread for an episode' })
  @ApiResponse({ status: 200, description: 'Thread retrieved successfully' })
  async getThreadByEpisode(@Param('episodeId') episodeId: string, @Request() req) {
    return this.messagingService.getThreadForEpisode(episodeId, req.user.id);
  }

  @Post(':threadId/read')
  @ApiOperation({ summary: 'Mark thread as read' })
  @ApiResponse({ status: 200, description: 'Thread marked as read' })
  async markAsRead(@Param('threadId') threadId: string, @Request() req) {
    return this.messagingService.markAsRead(threadId, req.user.id);
  }
}
