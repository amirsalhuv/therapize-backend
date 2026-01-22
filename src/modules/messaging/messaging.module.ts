import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, WsJwtGuard],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
