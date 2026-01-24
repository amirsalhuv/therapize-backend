import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional, MinLength } from 'class-validator';

export enum NoteType {
  PROGRESS_NOTE = 'PROGRESS_NOTE',
  SOAP_NOTE = 'SOAP_NOTE',
  DISCHARGE_NOTE = 'DISCHARGE_NOTE',
  GENERAL = 'GENERAL',
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Episode ID' })
  @IsUUID()
  episodeId: string;

  @ApiProperty({ description: 'Note title' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: 'Note content' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ description: 'Note type', enum: NoteType, default: NoteType.GENERAL })
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;
}
