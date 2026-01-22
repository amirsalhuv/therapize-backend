import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActiveExerciseDto {
  @ApiProperty({ description: 'Exercise ID' })
  @IsString()
  exerciseId: string;

  @ApiProperty({ description: 'Order index in the plan' })
  @IsNumber()
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Custom repetitions override' })
  @IsOptional()
  @IsNumber()
  customReps?: number;

  @ApiPropertyOptional({ description: 'Custom sets override' })
  @IsOptional()
  @IsNumber()
  customSets?: number;

  @ApiPropertyOptional({ description: 'Custom duration in minutes override' })
  @IsOptional()
  @IsNumber()
  customDuration?: number;

  @ApiPropertyOptional({ description: 'Custom notes for this exercise' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Date when exercise was added to plan' })
  @IsDateString()
  addedAt: string;
}
