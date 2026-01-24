import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { NoteType } from './create-note.dto';

export class UpdateNoteDto {
  @ApiProperty({ description: 'Note title', required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Note content', required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Note type', enum: NoteType, required: false })
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;
}
