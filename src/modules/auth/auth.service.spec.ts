import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database';
import { RegisterRole } from './dto/register.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('7d'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user with THERAPIST role', async () => {
      const registerDto = {
        email: 'therapist@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        role: RegisterRole.THERAPIST,
      };

      const createdUser = {
        id: 'user-123',
        email: registerDto.email.toLowerCase(),
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        roles: ['THERAPIST'],
        locale: 'EN',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(registerDto);

      expect(result.user).toBeDefined();
      expect(result.user.roles).toContain('THERAPIST');
      expect(result.user.roles).not.toContain('PATIENT');
      expect(result.message).toBe('Registration successful.');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roles: ['THERAPIST'],
          }),
        }),
      );
    });

    it('should default to PATIENT role when no role is specified', async () => {
      const registerDto = {
        email: 'patient@example.com',
        password: 'SecureP@ss123',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const createdUser = {
        id: 'user-456',
        email: registerDto.email.toLowerCase(),
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        roles: ['PATIENT'],
        locale: 'EN',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(registerDto);

      expect(result.user.roles).toContain('PATIENT');
      expect(result.user.roles).not.toContain('THERAPIST');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roles: ['PATIENT'],
          }),
        }),
      );
    });
  });
});
