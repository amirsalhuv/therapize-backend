import { IsArray, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TherapyDiscipline } from '@prisma/client';

export class SelectProgramsDto {
  @ApiProperty({
    description: 'Array of therapy disciplines to enroll in',
    example: ['PT', 'OT'],
    enum: ['PT', 'OT', 'ST', 'MT'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  disciplines: TherapyDiscipline[];
}

export class ScheduleFirstMeetingDto {
  @ApiProperty({
    description: 'Date and time for the first meeting',
    example: '2025-01-15T10:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;
}

export class SuggestedProgramDto {
  @ApiProperty({ enum: TherapyDiscipline })
  discipline: TherapyDiscipline;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isRecommended: boolean;

  @ApiPropertyOptional()
  therapistName?: string;
}
