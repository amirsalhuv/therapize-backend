import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database';
import { RegisterDto, LoginDto, RegisterPatientDto, RequestMagicLinkDto, AcceptFamilyInviteDto } from './dto';
import { JwtPayload, JwtRefreshPayload } from '../../common/interfaces';
import { Role } from '../../common/enums';
import { InvitationsService } from '../invitations/invitations.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => InvitationsService))
    private invitationsService: InvitationsService,
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

    // Create user with specified role (defaults to PATIENT)
    // TODO: Re-enable email verification when ready
    const role = dto.role || 'PATIENT';
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        locale: dto.locale || 'EN',
        roles: [role],
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
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

    // TODO: Re-enable email verification when ready
    // const verificationToken = uuidv4();
    // await this.prisma.emailVerificationToken.create({
    //   data: {
    //     userId: user.id,
    //     token: verificationToken,
    //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    //   },
    // });
    // const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    // console.log(`[Email Verification] Send email to ${user.email}`);
    // console.log(`[Email Verification] URL: ${frontendUrl}/verify-email/${verificationToken}`);

    return {
      user,
      message: 'Registration successful.',
    };
  }

  async registerPatient(dto: RegisterPatientDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate invitation token if provided
    let invitationRecord: {
      id: string;
      invitedByTherapistId: string | null;
    } | null = null;

    if (dto.invitationToken) {
      const invitation = await this.invitationsService.validateToken(dto.invitationToken);
      if (!invitation.valid) {
        throw new BadRequestException('Invalid invitation token');
      }
      // Get invitation record
      invitationRecord = await this.prisma.patientInvitation.findUnique({
        where: { token: dto.invitationToken },
        select: { id: true, invitedByTherapistId: true },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user and update/create patient profile in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber,
          gender: dto.gender,
          locale: dto.locale || 'EN',
          roles: ['PATIENT'],
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
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

      if (invitationRecord) {
        // Update existing PatientProfile (created when invitation was sent)
        await tx.patientProfile.update({
          where: { invitationId: invitationRecord.id },
          data: {
            userId: user.id,
            status: 'REGISTERED',
            ageRange: dto.ageRange,
            country: dto.country,
            city: dto.city,
            conditionDescription: dto.conditionDescription,
          },
        });
      } else {
        // No invitation - create new patient profile (self-signup)
        await tx.patientProfile.create({
          data: {
            userId: user.id,
            status: 'REGISTERED',
            ageRange: dto.ageRange,
            country: dto.country,
            city: dto.city,
            conditionDescription: dto.conditionDescription,
          },
        });
      }

      return user;
    });

    // Mark invitation as used if provided
    if (dto.invitationToken) {
      await this.invitationsService.markAsUsed(dto.invitationToken, result.id);
    }

    return {
      user: result,
      message: 'Patient registration successful.',
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

    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Please verify your email before logging in');
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

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestException('Token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Update user and token
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a verification link will be sent.' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete old tokens
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token
    const verificationToken = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Log verification URL (in production, send email)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    console.log(`[Email Verification] Resend email to ${user.email}`);
    console.log(`[Email Verification] URL: ${frontendUrl}/verify-email/${verificationToken}`);

    return { message: 'If the email exists, a verification link will be sent.' };
  }

  // ============================================
  // MAGIC LINK AUTHENTICATION
  // ============================================

  async requestMagicLink(dto: RequestMagicLinkDto) {
    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException('Either email or phone number is required');
    }

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: dto.email
        ? { email: dto.email.toLowerCase() }
        : { phoneNumber: dto.phoneNumber },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        roles: true,
        status: true,
      },
    });

    // Don't reveal if user exists
    if (!user || user.status !== 'ACTIVE') {
      return { message: 'If the account exists, a login link will be sent.' };
    }

    // Only allow magic link for family members
    if (!user.roles.includes('FAMILY_MEMBER')) {
      return { message: 'If the account exists, a login link will be sent.' };
    }

    // Delete old magic link tokens
    await this.prisma.magicLinkToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new magic link token (15 minutes expiry)
    const token = randomBytes(32).toString('hex');
    await this.prisma.magicLinkToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Generate magic link URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/auth/magic-link/${token}`;

    // Log magic link (in production, send email/SMS)
    console.log(`[Magic Link] Send to ${user.email || user.phoneNumber}`);
    console.log(`[Magic Link] URL: ${magicLink}`);

    return { message: 'If the account exists, a login link will be sent.' };
  }

  async verifyMagicLink(token: string, deviceInfo?: string, ipAddress?: string) {
    const magicLinkToken = await this.prisma.magicLinkToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roles: true,
            status: true,
            locale: true,
          },
        },
      },
    });

    if (!magicLinkToken) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    if (magicLinkToken.usedAt) {
      throw new BadRequestException('This magic link has already been used');
    }

    if (magicLinkToken.expiresAt < new Date()) {
      throw new BadRequestException('This magic link has expired');
    }

    if (!magicLinkToken.user || magicLinkToken.user.status !== 'ACTIVE') {
      throw new BadRequestException('Account is not active');
    }

    // Mark token as used
    await this.prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { usedAt: new Date() },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: magicLinkToken.user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      magicLinkToken.user.id,
      magicLinkToken.user.email,
      magicLinkToken.user.roles as Role[],
      deviceInfo,
      ipAddress,
    );

    return {
      user: {
        id: magicLinkToken.user.id,
        email: magicLinkToken.user.email,
        firstName: magicLinkToken.user.firstName,
        lastName: magicLinkToken.user.lastName,
        roles: magicLinkToken.user.roles,
        locale: magicLinkToken.user.locale,
      },
      ...tokens,
    };
  }

  // ============================================
  // FAMILY MEMBER INVITATION ACCEPTANCE
  // ============================================

  async acceptFamilyInvite(dto: AcceptFamilyInviteDto, deviceInfo?: string, ipAddress?: string) {
    // Find and validate invitation
    const invitation = await this.prisma.familyMemberInvitation.findUnique({
      where: { token: dto.token },
      include: {
        familyMemberProfile: true,
        patientProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.status === 'USED') {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.status === 'CANCELLED') {
      throw new BadRequestException('This invitation has been cancelled');
    }

    if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.familyMemberInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException('This invitation has expired');
    }

    // Use provided names or fall back to invitation names
    const firstName = dto.firstName || invitation.firstName;
    const lastName = dto.lastName || invitation.lastName;

    // Generate a unique email for family member (they may not have provided one)
    const email = invitation.email || `family-${invitation.id}@therapize.local`;

    // Create user and update family member profile in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: '', // Empty password - uses magic link only
          firstName,
          lastName,
          phoneNumber: invitation.phoneNumber,
          roles: ['FAMILY_MEMBER'],
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          locale: true,
        },
      });

      // Update family member profile with user ID
      await tx.familyMemberProfile.update({
        where: { id: invitation.familyMemberProfileId! },
        data: { userId: user.id },
      });

      // Mark invitation as used
      await tx.familyMemberInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'USED',
          usedAt: new Date(),
        },
      });

      return user;
    });

    // Generate tokens for auto-login
    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.roles as Role[],
      deviceInfo,
      ipAddress,
    );

    return {
      user: result,
      patientName: invitation.patientProfile?.user
        ? `${invitation.patientProfile.user.firstName} ${invitation.patientProfile.user.lastName}`
        : null,
      ...tokens,
    };
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
