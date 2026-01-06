/**
 * THE-4: Phase 1 - Database & Core Backend Tests
 * Tests for invitations module and patient registration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database';

describe('[THE-4] Phase 1: Database & Core Backend', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let therapistToken: string;
  let therapistUserId: string;
  const testTherapistEmail = `therapist-test-${Date.now()}@example.com`;
  const testPatientEmail = `patient-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Register a therapist to use for testing
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testTherapistEmail,
        password: 'SecureP@ss123',
        firstName: 'Test',
        lastName: 'Therapist',
        role: 'THERAPIST',
      });

    therapistUserId = registerResponse.body.user.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testTherapistEmail,
        password: 'SecureP@ss123',
      });

    therapistToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.patientInvitation.deleteMany({
      where: { invitedByUserId: therapistUserId },
    });
    await prisma.patientProfile.deleteMany({
      where: { user: { email: testPatientEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testTherapistEmail, testPatientEmail] } },
    });
    await app.close();
  });

  // ============================================
  // Database Schema Tests
  // ============================================
  describe('Database: Schema Verification', () => {
    it('should have AgeRange enum with correct values', async () => {
      // Test by creating an invitation with each age range
      const ageRanges = ['CHILD', 'TEEN', 'ADULT', 'SENIOR'];

      for (const ageRange of ageRanges) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${therapistToken}`)
          .send({ ageRange });

        expect(response.status).toBe(201);
        expect(response.body.ageRange).toBe(ageRange);

        // Clean up
        await prisma.patientInvitation.delete({ where: { id: response.body.id } });
      }
    });

    it('should have PatientInvitationStatus enum with correct values', async () => {
      // Create an invitation and verify status
      const invitation = await prisma.patientInvitation.create({
        data: {
          token: `test-token-${Date.now()}`,
          invitedByUserId: therapistUserId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(invitation.status).toBe('PENDING');

      // Verify all status values can be set
      const statuses = ['PENDING', 'USED', 'EXPIRED', 'CANCELLED'];
      for (const status of statuses) {
        const updated = await prisma.patientInvitation.update({
          where: { id: invitation.id },
          data: { status: status as 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED' },
        });
        expect(updated.status).toBe(status);
      }

      await prisma.patientInvitation.delete({ where: { id: invitation.id } });
    });

    it('should have PatientInvitation model with all required fields', async () => {
      const invitation = await prisma.patientInvitation.create({
        data: {
          token: `test-token-fields-${Date.now()}`,
          invitedByUserId: therapistUserId,
          firstName: 'John',
          lastName: 'Doe',
          ageRange: 'ADULT',
          gender: 'MALE',
          conditionDescription: 'Back pain',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(invitation).toHaveProperty('id');
      expect(invitation).toHaveProperty('token');
      expect(invitation).toHaveProperty('invitedByUserId');
      expect(invitation).toHaveProperty('firstName');
      expect(invitation).toHaveProperty('lastName');
      expect(invitation).toHaveProperty('ageRange');
      expect(invitation).toHaveProperty('gender');
      expect(invitation).toHaveProperty('conditionDescription');
      expect(invitation).toHaveProperty('status');
      expect(invitation).toHaveProperty('expiresAt');
      expect(invitation).toHaveProperty('createdAt');

      await prisma.patientInvitation.delete({ where: { id: invitation.id } });
    });

    it('should have PatientProfile with new fields (ageRange, country, city)', async () => {
      // Create a test user first
      const user = await prisma.user.create({
        data: {
          email: `profile-test-${Date.now()}@example.com`,
          passwordHash: 'hash',
          firstName: 'Test',
          lastName: 'User',
          roles: ['PATIENT'],
        },
      });

      const profile = await prisma.patientProfile.create({
        data: {
          userId: user.id,
          ageRange: 'ADULT',
          country: 'United States',
          city: 'New York',
          conditionDescription: 'Test condition',
        },
      });

      expect(profile).toHaveProperty('ageRange');
      expect(profile).toHaveProperty('country');
      expect(profile).toHaveProperty('city');
      expect(profile).toHaveProperty('conditionDescription');
      expect(profile.ageRange).toBe('ADULT');
      expect(profile.country).toBe('United States');
      expect(profile.city).toBe('New York');

      await prisma.patientProfile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  // ============================================
  // Invitations API Tests
  // ============================================
  describe('API: POST /api/v1/invitations', () => {
    it('should create invitation with all optional fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          ageRange: 'ADULT',
          gender: 'FEMALE',
          conditionDescription: 'Back pain for 2 months',
          expirationDays: 7,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('inviteLink');
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.ageRange).toBe('ADULT');
      expect(response.body.gender).toBe('FEMALE');
      expect(response.body.status).toBe('PENDING');

      await prisma.patientInvitation.delete({ where: { id: response.body.id } });
    });

    it('should create invitation with minimal data (empty body)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('inviteLink');
      expect(response.body.status).toBe('PENDING');

      await prisma.patientInvitation.delete({ where: { id: response.body.id } });
    });

    it('should reject invalid ageRange value', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ ageRange: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should reject invalid gender value', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ gender: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should reject expirationDays outside valid range', async () => {
      const responseTooLow = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ expirationDays: 0 });

      expect(responseTooLow.status).toBe(400);

      const responseTooHigh = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ expirationDays: 31 });

      expect(responseTooHigh.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('API: GET /api/v1/invitations', () => {
    let invitationId: string | null = null;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ firstName: 'Test', lastName: 'Invitation' });

      if (response.status === 201) {
        invitationId = response.body.id;
      }
    });

    afterAll(async () => {
      if (invitationId) {
        await prisma.patientInvitation.delete({ where: { id: invitationId } }).catch(() => {});
      }
    });

    it('should list therapist invitations with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('invitations');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.invitations)).toBe(true);
    });

    it('should include inviteLink for pending invitations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`);

      const pendingInvitation = response.body.invitations.find(
        (inv: { status: string }) => inv.status === 'PENDING',
      );

      if (pendingInvitation) {
        expect(pendingInvitation).toHaveProperty('inviteLink');
        expect(pendingInvitation.inviteLink).toContain('/signup/patient/invited/');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invitations');

      expect(response.status).toBe(401);
    });
  });

  describe('API: GET /api/v1/invitations/validate/:token', () => {
    let validToken: string | null = null;
    let invitationId: string | null = null;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({
          firstName: 'Validate',
          lastName: 'Test',
          ageRange: 'ADULT',
          gender: 'MALE',
          conditionDescription: 'Test condition',
        });

      if (response.status === 201) {
        validToken = response.body.token;
        invitationId = response.body.id;
      }
    });

    afterAll(async () => {
      if (invitationId) {
        await prisma.patientInvitation.delete({ where: { id: invitationId } }).catch(() => {});
      }
    });

    it('should validate token and return pre-filled data', async () => {
      expect(validToken).toBeDefined();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invitations/validate/${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.firstName).toBe('Validate');
      expect(response.body.lastName).toBe('Test');
      expect(response.body.ageRange).toBe('ADULT');
      expect(response.body.gender).toBe('MALE');
      expect(response.body).toHaveProperty('invitedBy');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invitations/validate/non-existent-token');

      expect(response.status).toBe(404);
    });

    it('should return 400 for expired token', async () => {
      // Create an expired invitation
      const expiredInvitation = await prisma.patientInvitation.create({
        data: {
          token: `expired-token-${Date.now()}`,
          invitedByUserId: therapistUserId,
          status: 'EXPIRED',
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/invitations/validate/${expiredInvitation.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('expired');

      await prisma.patientInvitation.delete({ where: { id: expiredInvitation.id } });
    });

    it('should return 400 for used token', async () => {
      const usedInvitation = await prisma.patientInvitation.create({
        data: {
          token: `used-token-${Date.now()}`,
          invitedByUserId: therapistUserId,
          status: 'USED',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/invitations/validate/${usedInvitation.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already been used');

      await prisma.patientInvitation.delete({ where: { id: usedInvitation.id } });
    });

    it('should be publicly accessible (no auth required)', async () => {
      expect(validToken).toBeDefined();
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invitations/validate/${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('API: DELETE /api/v1/invitations/:id', () => {
    it('should cancel a pending invitation', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ firstName: 'To', lastName: 'Cancel' });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/invitations/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${therapistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');

      await prisma.patientInvitation.delete({ where: { id: createResponse.body.id } });
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/invitations/non-existent-id')
        .set('Authorization', `Bearer ${therapistToken}`);

      expect(response.status).toBe(404);
    });

    it('should not allow cancelling others invitations', async () => {
      // Create another therapist
      const anotherTherapistEmail = `another-therapist-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: anotherTherapistEmail,
          password: 'SecureP@ss123',
          firstName: 'Another',
          lastName: 'Therapist',
          role: 'THERAPIST',
        });

      // Login to get token
      const anotherLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: anotherTherapistEmail,
          password: 'SecureP@ss123',
        });

      const anotherToken = anotherLogin.body.accessToken;

      // Create invitation as original therapist
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ firstName: 'Not', lastName: 'Yours' });

      // Try to cancel as another therapist
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/invitations/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await prisma.patientInvitation.delete({ where: { id: createResponse.body.id } });
      await prisma.user.delete({ where: { email: anotherTherapistEmail } });
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/invitations/some-id');

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Patient Registration Tests
  // ============================================
  describe('API: POST /api/v1/auth/register/patient', () => {
    it('should register patient with profile data (self signup)', async () => {
      const email = `patient-self-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email,
          password: 'SecureP@ss123',
          firstName: 'Self',
          lastName: 'Patient',
          ageRange: 'ADULT',
          gender: 'MALE',
          country: 'United States',
          city: 'Los Angeles',
          conditionDescription: 'Knee pain',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.roles).toContain('PATIENT');

      // Verify patient profile was created
      const profile = await prisma.patientProfile.findFirst({
        where: { user: { email } },
      });

      expect(profile).toBeDefined();
      expect(profile?.ageRange).toBe('ADULT');
      expect(profile?.country).toBe('United States');
      expect(profile?.city).toBe('Los Angeles');

      // Clean up
      await prisma.patientProfile.delete({ where: { id: profile!.id } });
      await prisma.user.delete({ where: { email } });
    });

    it('should register patient with invitation token', async () => {
      // Create invitation
      const inviteResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({
          firstName: 'Invited',
          lastName: 'Patient',
          ageRange: 'TEEN',
          gender: 'FEMALE',
          conditionDescription: 'Shoulder pain',
        });

      expect(inviteResponse.status).toBe(201);
      const token = inviteResponse.body.token;
      const invitationId = inviteResponse.body.id;
      const email = `patient-invited-${Date.now()}@example.com`;

      // Register with invitation
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email,
          password: 'SecureP@ss123',
          firstName: 'Invited',
          lastName: 'Patient',
          invitationToken: token,
        });

      expect(response.status).toBe(201);
      expect(response.body.user.roles).toContain('PATIENT');

      // Verify invitation was marked as used
      const updatedInvitation = await prisma.patientInvitation.findUnique({
        where: { id: invitationId },
      });

      expect(updatedInvitation?.status).toBe('USED');
      expect(updatedInvitation?.usedByUserId).toBeDefined();

      // Clean up
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.patientProfile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
      await prisma.patientInvitation.delete({ where: { id: invitationId } }).catch(() => {});
    });

    it('should reject invalid invitation token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email: `invalid-token-${Date.now()}@example.com`,
          password: 'SecureP@ss123',
          firstName: 'Invalid',
          lastName: 'Token',
          invitationToken: 'invalid-token-12345',
        });

      // Token validation returns 404 when token not found
      expect([400, 404]).toContain(response.status);
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email,
          password: 'SecureP@ss123',
          firstName: 'First',
          lastName: 'Patient',
        });

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email,
          password: 'SecureP@ss123',
          firstName: 'Second',
          lastName: 'Patient',
        });

      expect(response.status).toBe(409);

      // Clean up
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.patientProfile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it('should validate password requirements', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email: `weak-pass-${Date.now()}@example.com`,
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password',
        });

      expect(response.status).toBe(400);
    });

    it('should require firstName and lastName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/patient')
        .send({
          email: `no-name-${Date.now()}@example.com`,
          password: 'SecureP@ss123',
        });

      expect(response.status).toBe(400);
    });
  });
});
