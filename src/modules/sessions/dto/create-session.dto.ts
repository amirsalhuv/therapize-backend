import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  episodeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

export class SessionFeedbackDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  overallRating: number;

  @ApiProperty({ minimum: 0, maximum: 10, required: false })
  @IsOptional()
  painNow?: number;

  @ApiProperty({ minimum: 0, maximum: 10, required: false })
  @IsOptional()
  fatigueNow?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsOptional()
  confidence?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  newSymptoms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  newSymptomsDetails?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
