import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberInvitationDto, UpdateFamilyMemberDto } from './dto';
import { Roles, CurrentUser, Public } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('family-members')
@Controller('api/v1/family-members')
export class FamilyMembersController {
  constructor(private familyMembersService: FamilyMembersService) {}

  @Post('invite')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Create family member invitation' })
  createInvitation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyMemberInvitationDto,
  ) {
    return this.familyMembersService.createInvitation(userId, dto);
  }

  @Get('patient/:patientId')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'List family members for a patient' })
  findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familyMembersService.findByPatient(patientId, userId);
  }

  @Get('patient/:patientId/invitations')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'List pending invitations for a patient' })
  findPendingInvitations(
    @Param('patientId') patientId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familyMembersService.findPendingInvitations(patientId, userId);
  }

  @Get('invite/validate/:token')
  @Public()
  @ApiOperation({ summary: 'Validate family member invitation token' })
  validateToken(@Param('token') token: string) {
    return this.familyMembersService.validateInvitationToken(token);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Update family member permissions' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.familyMembersService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Remove family member' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familyMembersService.remove(id, userId);
  }

  @Delete('invitations/:id')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Cancel family member invitation' })
  cancelInvitation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familyMembersService.cancelInvitation(id, userId);
  }
}
