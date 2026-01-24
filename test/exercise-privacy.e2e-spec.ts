/**
 * E2E Tests: Exercise Privacy and Name Uniqueness Validation
 *
 * Tests the following features:
 * 1. Public/private exercise creation via isLibraryExercise field
 * 2. Name uniqueness validation:
 *    - Public exercises: globally unique names (case-insensitive)
 *    - Private exercises: unique within creator's private exercises only
 * 3. Exercise filtering by libraryOnly parameter
 * 4. Case-insensitive name checking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database';

describe('Exercise Privacy and Name Uniqueness (E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let therapist1Token: string;
  let therapist2Token: string;
  let therapist1Id: string;
  let therapist2Id: string;
  const therapist1Email = `therapist1-${Date.now()}@test.com`;
  const therapist2Email = `therapist2-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Register and login therapist 1
    const register1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: therapist1Email,
        password: 'TestPass123!',
        firstName: 'Therapist',
        lastName: 'One',
        role: 'THERAPIST',
      });

    if (register1.body.accessToken) {
      therapist1Token = register1.body.accessToken;
      therapist1Id = register1.body.user.therapistProfile?.id;
    }

    // Register and login therapist 2
    const register2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: therapist2Email,
        password: 'TestPass123!',
        firstName: 'Therapist',
        lastName: 'Two',
        role: 'THERAPIST',
      });

    if (register2.body.accessToken) {
      therapist2Token = register2.body.accessToken;
      therapist2Id = register2.body.user.therapistProfile?.id;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.exercise.deleteMany({
      where: {
        createdById: {
          in: [therapist1Id, therapist2Id],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [therapist1Email, therapist2Email],
        },
      },
    });

    await app.close();
  });

  describe('Public Exercise Creation', () => {
    const publicExerciseName = `Public Exercise Test ${Date.now()}`;

    it('should create a public exercise successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: publicExerciseName,
          description: 'Test public exercise',
          category: 'Orthopedic',
          bodyParts: ['Upper Extremity'],
          difficulty: 3,
          isLibraryExercise: true,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: publicExerciseName,
        isLibraryExercise: true,
        createdById: therapist1Id,
      });
    });

    it('should prevent creating duplicate public exercise name (case-insensitive)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist2Token}`)
        .send({
          name: publicExerciseName.toLowerCase(), // Different case
          description: 'Duplicate public exercise',
          category: 'Neurological',
          bodyParts: ['Lower Extremity'],
          difficulty: 2,
          isLibraryExercise: true,
        })
        .expect(400);

      expect(response.body.message).toContain('A public exercise with the name');
      expect(response.body.message).toContain('already exists');
    });

    it('should show public exercise in library search with libraryOnly=true', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist2Token}`)
        .query({ libraryOnly: true })
        .expect(200);

      expect(response.body.exercises).toBeDefined();
      const foundExercise = response.body.exercises.find(
        (ex: any) => ex.name === publicExerciseName,
      );
      expect(foundExercise).toBeDefined();
      expect(foundExercise.isLibraryExercise).toBe(true);
    });
  });

  describe('Private Exercise Creation', () => {
    const privateExerciseName = `Private Exercise Test ${Date.now()}`;

    it('should create a private exercise successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: privateExerciseName,
          description: 'Test private exercise',
          category: 'Geriatric',
          bodyParts: ['Core'],
          difficulty: 4,
          isLibraryExercise: false,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: privateExerciseName,
        isLibraryExercise: false,
        createdById: therapist1Id,
      });
    });

    it('should prevent creating duplicate private exercise name for same creator', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: privateExerciseName.toUpperCase(), // Different case, same creator
          description: 'Duplicate private exercise',
          category: 'Pediatric',
          bodyParts: ['Full Body'],
          difficulty: 2,
          isLibraryExercise: false,
        })
        .expect(400);

      expect(response.body.message).toContain('You already have a private exercise named');
    });

    it('should allow same private exercise name for different creators', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist2Token}`)
        .send({
          name: privateExerciseName, // Same name, different creator
          description: 'Another therapist private exercise',
          category: 'Sports Medicine',
          bodyParts: ['Hip'],
          difficulty: 3,
          isLibraryExercise: false,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: privateExerciseName,
        isLibraryExercise: false,
        createdById: therapist2Id,
      });
    });

    it('should NOT show private exercise in public library search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist2Token}`)
        .query({ libraryOnly: true })
        .expect(200);

      expect(response.body.exercises).toBeDefined();
      const privateExercise = response.body.exercises.find(
        (ex: any) => ex.name === privateExerciseName && ex.createdById === therapist1Id,
      );
      expect(privateExercise).toBeUndefined();
    });

    it('should show only creator private exercises when filtering by createdById', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .query({ libraryOnly: false, createdById: therapist1Id })
        .expect(200);

      expect(response.body.exercises).toBeDefined();

      const privateExercises = response.body.exercises.filter(
        (ex: any) => ex.name === privateExerciseName && ex.createdById === therapist1Id,
      );

      expect(privateExercises.length).toBe(1);
      expect(privateExercises[0].createdById).toBe(therapist1Id);
    });
  });

  describe('Mixed Public/Private Scope', () => {
    const sharedName = `Shared Name Test ${Date.now()}`;

    it('should allow same name to exist as both public and private (different scopes)', async () => {
      // Create public exercise
      const publicResponse = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: sharedName,
          description: 'Public version',
          category: 'Orthopedic',
          bodyParts: ['Shoulder'],
          difficulty: 3,
          isLibraryExercise: true,
        })
        .expect(201);

      expect(publicResponse.body.isLibraryExercise).toBe(true);

      // Create private exercise with same name (should succeed - different scope)
      const privateResponse = await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: sharedName,
          description: 'Private version',
          category: 'Neurological',
          bodyParts: ['Knee'],
          difficulty: 2,
          isLibraryExercise: false,
        })
        .expect(201);

      expect(privateResponse.body.isLibraryExercise).toBe(false);
    });

    it('should filter correctly by libraryOnly parameter', async () => {
      // Get public exercises only
      const publicResponse = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .query({ libraryOnly: true })
        .expect(200);

      const publicExercise = publicResponse.body.exercises.find(
        (ex: any) => ex.name === sharedName && ex.isLibraryExercise === true,
      );
      expect(publicExercise).toBeDefined();

      // Get private exercises only
      const privateResponse = await request(app.getHttpServer())
        .get('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .query({ libraryOnly: false, createdById: therapist1Id })
        .expect(200);

      const privateExercise = privateResponse.body.exercises.find(
        (ex: any) => ex.name === sharedName && ex.isLibraryExercise === false,
      );
      expect(privateExercise).toBeDefined();
    });
  });

  describe('Case Sensitivity', () => {
    const caseTestPublic = `Case Test Public ${Date.now()}`;
    const caseTestPrivate = `Case Test Private ${Date.now()}`;

    beforeAll(async () => {
      // Create public exercise
      await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: caseTestPublic,
          description: 'Public case test',
          category: 'Orthopedic',
          bodyParts: ['Upper Extremity'],
          difficulty: 3,
          isLibraryExercise: true,
        });

      // Create private exercise
      await request(app.getHttpServer())
        .post('/api/v1/exercises')
        .set('Authorization', `Bearer ${therapist1Token}`)
        .send({
          name: caseTestPrivate,
          description: 'Private case test',
          category: 'Orthopedic',
          bodyParts: ['Upper Extremity'],
          difficulty: 3,
          isLibraryExercise: false,
        });
    });

    it('should treat public exercise names as case-insensitive', async () => {
      const variations = [
        caseTestPublic.toUpperCase(),
        caseTestPublic.toLowerCase(),
        caseTestPublic.replace(/\w/, (c) => c.toUpperCase()),
      ];

      for (const name of variations) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/exercises')
          .set('Authorization', `Bearer ${therapist2Token}`)
          .send({
            name,
            description: 'Testing case sensitivity',
            category: 'Orthopedic',
            bodyParts: ['Upper Extremity'],
            difficulty: 3,
            isLibraryExercise: true,
          })
          .expect(400);

        expect(response.body.message).toContain('already exists');
      }
    });

    it('should treat private exercise names as case-insensitive for same creator', async () => {
      const variations = [
        caseTestPrivate.toUpperCase(),
        caseTestPrivate.toLowerCase(),
      ];

      for (const name of variations) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/exercises')
          .set('Authorization', `Bearer ${therapist1Token}`)
          .send({
            name,
            description: 'Testing case sensitivity',
            category: 'Orthopedic',
            bodyParts: ['Upper Extremity'],
            difficulty: 3,
            isLibraryExercise: false,
          })
          .expect(400);

        expect(response.body.message).toContain('You already have a private exercise named');
      }
    });
  });
});
