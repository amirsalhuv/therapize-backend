import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket with Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Serve static video files from ../Videos folder
  const videosPath = join(process.cwd(), '..', 'Videos');
  console.log('📹 Serving videos from:', videosPath);
  app.use('/videos', express.static(videosPath));

  // Serve uploaded files from uploads folder (development)
  const uploadsPath = join(process.cwd(), 'uploads');
  console.log('📁 Serving uploads from:', uploadsPath);
  app.use('/uploads', express.static(uploadsPath));

  // Security headers
  app.use(helmet.default());

  // CORS - support multiple origins (comma-separated in env)
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    // Allow WebSocket upgrades
    transports: ['websocket', 'polling'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Therapize API')
    .setDescription('Remote Therapy Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('patients', 'Patient management')
    .addTag('therapists', 'Therapist management')
    .addTag('episodes', 'Program episodes')
    .addTag('sessions', 'Therapy sessions')
    .addTag('messaging', 'Real-time messaging')
    .addTag('uploads', 'File uploads')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Therapize API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
