import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { Roles, CurrentUser, Public } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('invitations')
@Controller('api/v1/invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Create patient invitation' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'List my sent invitations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findMyInvitations(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.invitationsService.findMyInvitations(userId, +page, +limit);
  }

  @Get('validate/:token')
  @Public()
  @ApiOperation({ summary: 'Validate invitation token and get pre-filled data' })
  validateToken(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST, Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Cancel invitation' })
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.invitationsService.cancel(id, userId);
  }
}
