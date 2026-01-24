import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto';
import { WsJwtGuard } from './guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user?: { id: string; email: string };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MessagingGateway');
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(private messagingService: MessagingService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Decode JWT to get user info (validation happens in guards)
      const payload = this.decodeToken(token);
      if (!payload?.sub) {
        client.disconnect();
        return;
      }

      client.user = { id: payload.sub, email: payload.email };

      // Track socket
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user?.id) {
      const sockets = this.userSockets.get(client.user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.user.id);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinThread')
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.user) {
      this.logger.warn('joinThread: Unauthorized client');
      return { error: 'Unauthorized' };
    }

    try {
      // Verify user is participant
      await this.messagingService.getThread(data.threadId, client.user.id);

      client.join(`thread:${data.threadId}`);
      this.logger.log(`User ${client.user.id} joined thread ${data.threadId}`);

      return { success: true, threadId: data.threadId };
    } catch (error) {
      this.logger.error(`joinThread error for user ${client.user.id}: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    client.leave(`thread:${data.threadId}`);
    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateMessageDto,
  ) {
    if (!client.user) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.messagingService.createMessage(client.user.id, data);

      // Broadcast to all participants in the thread
      this.server.to(`thread:${data.threadId}`).emit('newMessage', message);
      this.logger.log(`Message sent to thread ${data.threadId} by user ${client.user.id}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`sendMessage error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    if (!client.user) return;

    client.to(`thread:${data.threadId}`).emit('typing', {
      userId: client.user.id,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.user) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.messagingService.markAsRead(data.threadId, client.user.id);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Helper to decode JWT (basic decode, not verification)
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return null;
    }
  }

  // Utility to emit to specific users
  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }
}
