import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreateInvitationDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvitationDto) {
    // Get therapist profile if exists
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId },
    });

    const token = randomBytes(32).toString('hex');
    const expirationDays = dto.expirationDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const invitation = await this.prisma.patientInvitation.create({
      data: {
        token,
        invitedByUserId: userId,
        invitedByTherapistId: therapistProfile?.id ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        ageRange: dto.ageRange,
        gender: dto.gender,
        conditionDescription: dto.conditionDescription,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      ...invitation,
      inviteLink: this.generateInviteLink(token),
    };
  }

  async findMyInvitations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      this.prisma.patientInvitation.findMany({
        where: { invitedByUserId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          usedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.patientInvitation.count({
        where: { invitedByUserId: userId },
      }),
    ]);

    // Add invite links to pending invitations
    const invitationsWithLinks = invitations.map((inv) => ({
      ...inv,
      inviteLink: inv.status === 'PENDING' ? this.generateInviteLink(inv.token) : null,
    }));

    return { invitations: invitationsWithLinks, total, page, limit };
  }

  async validateToken(token: string) {
    const invitation = await this.prisma.patientInvitation.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'USED') {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.status === 'CANCELLED') {
      throw new BadRequestException('This invitation has been cancelled');
    }

    if (invitation.status === 'EXPIRED' || new Date() > invitation.expiresAt) {
      // Update status if expired but not marked
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.patientInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException('This invitation has expired');
    }

    return {
      valid: true,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      ageRange: invitation.ageRange,
      gender: invitation.gender,
      conditionDescription: invitation.conditionDescription,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
    };
  }

  async markAsUsed(token: string, userId: string) {
    const invitation = await this.prisma.patientInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    return this.prisma.patientInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'USED',
        usedAt: new Date(),
        usedByUserId: userId,
      },
    });
  }

  async cancel(id: string, userId: string) {
    const invitation = await this.prisma.patientInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedByUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own invitations');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    return this.prisma.patientInvitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private generateInviteLink(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/signup/patient/invited/${token}`;
  }
}
