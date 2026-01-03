import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload, JwtRefreshPayload } from '../../common/interfaces';
import { Role } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user with PATIENT role by default
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        locale: dto.locale || 'EN',
        roles: ['PATIENT'],
        status: 'ACTIVE', // In production, set to PENDING_VERIFICATION and send email
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        locale: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.roles as Role[]);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        roles: true,
        status: true,
        locale: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.roles as Role[],
      deviceInfo,
      ipAddress,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        locale: user.locale,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshTokenId: string) {
    // Revoke the old refresh token
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { isRevoked: true },
    });

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    return this.generateTokens(user.id, user.email, user.roles as Role[]);
  }

  async logout(userId: string, refreshTokenId?: string) {
    if (refreshTokenId) {
      // Revoke specific token
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenId },
        data: { isRevoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    // Revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Logged out from all devices' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        avatarUrl: true,
        locale: true,
        timezone: true,
        roles: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        patientProfile: {
          select: {
            id: true,
            medicalRecordNumber: true,
            primaryDiagnosis: true,
          },
        },
        therapistProfile: {
          select: {
            id: true,
            licenseNumber: true,
            specializations: true,
            isLeadTherapist: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
    roles: Role[],
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    // Create refresh token record in database
    const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const refreshExpiresAt = this.calculateExpirationDate(refreshTokenExpiration);

    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: uuidv4(), // This is just an identifier, not the actual JWT
        expiresAt: refreshExpiresAt,
        deviceInfo,
        ipAddress,
      },
    });

    // Create JWT payloads
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      email,
      roles,
      refreshTokenId: refreshTokenRecord.id,
    };

    // Sign tokens - use seconds for expiration
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: 900, // 15 minutes
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: 604800, // 7 days
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private calculateExpirationDate(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if parsing fails
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
