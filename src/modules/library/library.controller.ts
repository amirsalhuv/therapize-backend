import { Controller, Get, Post, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { Public } from '../../common/decorators';
import { LibraryService } from './library.service';
import { SearchLibraryDto } from './dto';
import { CurrentLocale } from '../../i18n';
import type { Locale } from '../../i18n';

@ApiTags('Library')
@Controller('api/v1/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Public()
  @Get('templates')
  @ApiOperation({ summary: 'Search and filter program templates' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  searchTemplates(
    @Query() dto: SearchLibraryDto,
    @CurrentLocale() locale: Locale,
  ) {
    return this.libraryService.searchTemplates(dto, locale);
  }

  @Public()
  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific program template' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getTemplate(
    @Param('id') id: string,
    @CurrentLocale() locale: Locale,
  ) {
    return this.libraryService.getTemplate(id, locale);
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
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getCategories(@CurrentLocale() locale: Locale) {
    return this.libraryService.getCategories(locale);
  }

  @Public()
  @Get('conditions')
  @ApiOperation({ summary: 'Get available target conditions' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getConditions(@CurrentLocale() locale: Locale) {
    return this.libraryService.getConditions(locale);
  }

  @Public()
  @Get('body-parts')
  @ApiOperation({ summary: 'Get available body parts' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Locale: en or he' })
  getBodyParts(@CurrentLocale() locale: Locale) {
    return this.libraryService.getBodyParts(locale);
  }
}
