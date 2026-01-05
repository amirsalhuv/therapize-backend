import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `therapist-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a THERAPIST with correct role in database', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'Therapist',
          role: 'THERAPIST',
        })
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.roles).toContain('THERAPIST');
      expect(response.body.user.roles).not.toContain('PATIENT');

      // Verify in database
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser!.roles).toContain('THERAPIST');
      expect(dbUser!.roles).not.toContain('PATIENT');
    });
  });
});
