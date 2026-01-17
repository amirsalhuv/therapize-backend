import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database';
import { CreateFamilyMemberInvitationDto, UpdateFamilyMemberDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class FamilyMembersService {
  constructor(private prisma: PrismaService) {}

  async createInvitation(therapistUserId: string, dto: CreateFamilyMemberInvitationDto) {
    // Verify therapist has access to this patient
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: therapistUserId },
    });

    if (!therapistProfile) {
      throw new ForbiddenException('Only therapists can invite family members');
    }

    // Verify patient exists and therapist has a relationship with them
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { id: dto.patientProfileId },
      include: {
        therapistRelationships: {
          where: { therapistId: therapistProfile.id },
        },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient not found');
    }

    if (patientProfile.therapistRelationships.length === 0) {
      throw new ForbiddenException('You do not have a relationship with this patient');
    }

    // Require either email or phone
    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException('Either email or phone number is required');
    }

    const token = randomBytes(32).toString('hex');
    const expirationDays = dto.expirationDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create invitation and family member profile in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the FamilyMemberProfile (no user yet)
      const familyMemberProfile = await tx.familyMemberProfile.create({
        data: {
          patientProfileId: dto.patientProfileId,
          relationship: dto.relationship,
          canStartSessions: true,
        },
      });

      // Create the invitation
      const invitation = await tx.familyMemberInvitation.create({
        data: {
          token,
          patientProfileId: dto.patientProfileId,
          invitedByTherapistId: therapistProfile.id,
          familyMemberProfileId: familyMemberProfile.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          relationship: dto.relationship,
          expiresAt,
        },
        include: {
          patientProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          invitedByTherapist: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      return { invitation, familyMemberProfile };
    });

    return {
      ...result.invitation,
      inviteLink: this.generateInviteLink(token),
    };
  }

  async findByPatient(patientProfileId: string, therapistUserId: string) {
    // Verify therapist has access
    await this.verifyTherapistAccess(patientProfileId, therapistUserId);

    const familyMembers = await this.prisma.familyMemberProfile.findMany({
      where: { patientProfileId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        invitation: {
          select: {
            id: true,
            status: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return familyMembers.map((fm) => ({
      id: fm.id,
      relationship: fm.relationship,
      canStartSessions: fm.canStartSessions,
      createdAt: fm.createdAt,
      // User info (if registered)
      user: fm.user,
      // Invitation info (for pending invites)
      invitation: fm.invitation,
      // Status derived from whether user exists
      status: fm.user ? 'ACTIVE' : 'PENDING',
    }));
  }

  async findPendingInvitations(patientProfileId: string, therapistUserId: string) {
    await this.verifyTherapistAccess(patientProfileId, therapistUserId);

    const invitations = await this.prisma.familyMemberInvitation.findMany({
      where: {
        patientProfileId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      ...inv,
      inviteLink: this.generateInviteLink(inv.token),
    }));
  }

  async remove(familyMemberProfileId: string, therapistUserId: string) {
    const familyMemberProfile = await this.prisma.familyMemberProfile.findUnique({
      where: { id: familyMemberProfileId },
      include: { invitation: true },
    });

    if (!familyMemberProfile) {
      throw new NotFoundException('Family member not found');
    }

    await this.verifyTherapistAccess(familyMemberProfile.patientProfileId, therapistUserId);

    // Delete in transaction
    return this.prisma.$transaction(async (tx) => {
      // Delete invitation if exists
      if (familyMemberProfile.invitation) {
        await tx.familyMemberInvitation.delete({
          where: { id: familyMemberProfile.invitation.id },
        });
      }

      // Delete family member profile (cascades to user relationship)
      await tx.familyMemberProfile.delete({
        where: { id: familyMemberProfileId },
      });

      return { success: true };
    });
  }

  async cancelInvitation(invitationId: string, therapistUserId: string) {
    const invitation = await this.prisma.familyMemberInvitation.findUnique({
      where: { id: invitationId },
      include: { familyMemberProfile: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.verifyTherapistAccess(invitation.patientProfileId, therapistUserId);

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete the family member profile if it has no user
      if (invitation.familyMemberProfile && !invitation.familyMemberProfile.userId) {
        await tx.familyMemberProfile.delete({
          where: { id: invitation.familyMemberProfile.id },
        });
      }

      // Update invitation status
      return tx.familyMemberInvitation.update({
        where: { id: invitationId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async update(familyMemberProfileId: string, therapistUserId: string, dto: UpdateFamilyMemberDto) {
    const familyMemberProfile = await this.prisma.familyMemberProfile.findUnique({
      where: { id: familyMemberProfileId },
    });

    if (!familyMemberProfile) {
      throw new NotFoundException('Family member not found');
    }

    await this.verifyTherapistAccess(familyMemberProfile.patientProfileId, therapistUserId);

    return this.prisma.familyMemberProfile.update({
      where: { id: familyMemberProfileId },
      data: dto,
    });
  }

  async validateInvitationToken(token: string) {
    const invitation = await this.prisma.familyMemberInvitation.findUnique({
      where: { token },
      include: {
        patientProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        invitedByTherapist: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
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
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.familyMemberInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException('This invitation has expired');
    }

    const patientName = invitation.patientProfile?.user
      ? `${invitation.patientProfile.user.firstName} ${invitation.patientProfile.user.lastName}`
      : 'the patient';

    return {
      valid: true,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      phoneNumber: invitation.phoneNumber,
      relationship: invitation.relationship,
      patientName,
      invitedBy: invitation.invitedByTherapist?.user
        ? `${invitation.invitedByTherapist.user.firstName} ${invitation.invitedByTherapist.user.lastName}`
        : null,
      expiresAt: invitation.expiresAt,
    };
  }

  private async verifyTherapistAccess(patientProfileId: string, therapistUserId: string) {
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: therapistUserId },
    });

    if (!therapistProfile) {
      throw new ForbiddenException('Therapist profile not found');
    }

    const relationship = await this.prisma.patientTherapistRelationship.findFirst({
      where: {
        patientId: patientProfileId,
        therapistId: therapistProfile.id,
      },
    });

    if (!relationship) {
      throw new ForbiddenException('You do not have access to this patient');
    }

    return therapistProfile;
  }

  private generateInviteLink(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/family/accept-invite/${token}`;
  }
}
