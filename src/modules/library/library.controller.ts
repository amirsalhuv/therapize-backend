import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { Public } from '../../common/decorators';
import { LibraryService } from './library.service';
import { SearchLibraryDto } from './dto';

@ApiTags('Library')
@Controller('api/v1/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Public()
  @Get('templates')
  @ApiOperation({ summary: 'Search and filter program templates' })
  searchTemplates(@Query() dto: SearchLibraryDto) {
    return this.libraryService.searchTemplates(dto);
  }

  @Public()
  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific program template' })
  getTemplate(@Param('id') id: string) {
    return this.libraryService.getTemplate(id);
  }

  @Post('templates/:id/select')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select a template to create a copy for customization' })
  async selectTemplate(@Param('id') id: string, @Request() req: any) {
    const therapistId = req.user.therapistProfileId;
    return this.libraryService.selectTemplate(id, therapistId);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get available program categories' })
  getCategories() {
    return this.libraryService.getCategories();
  }

  @Public()
  @Get('conditions')
  @ApiOperation({ summary: 'Get available target conditions' })
  getConditions() {
    return this.libraryService.getConditions();
  }

  @Public()
  @Get('body-parts')
  @ApiOperation({ summary: 'Get available body parts' })
  getBodyParts() {
    return this.libraryService.getBodyParts();
  }
}
