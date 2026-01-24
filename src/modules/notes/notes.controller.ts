import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('api/v1/notes')
export class NotesController {
  constructor(private readonly service: NotesService) {}

  @Post()
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Create a clinical note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized for this episode' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  create(
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.create(dto, user.therapistProfileId);
  }

  @Get('episode/:episodeId')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get all notes for an episode' })
  @ApiResponse({ status: 200, description: 'Notes found' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  findByEpisode(
    @Param('episodeId', ParseUUIDPipe) episodeId: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.findByEpisode(episodeId, user.therapistProfileId);
  }

  @Get(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiResponse({ status: 200, description: 'Note found' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.findOne(id, user.therapistProfileId);
  }

  @Patch(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Update a clinical note' })
  @ApiResponse({ status: 200, description: 'Note updated' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.update(id, dto, user.therapistProfileId);
  }

  @Delete(':id')
  @Roles(Role.THERAPIST, Role.LEAD_THERAPIST)
  @ApiOperation({ summary: 'Delete a clinical note' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; therapistProfileId: string },
  ) {
    return this.service.remove(id, user.therapistProfileId);
  }
}
