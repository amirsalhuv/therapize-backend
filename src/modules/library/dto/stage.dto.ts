import { IsString, IsOptional, IsInt, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SessionStageType {
  WARMUP = 'WARMUP',
  MAIN = 'MAIN',
  COOLDOWN = 'COOLDOWN',
  STRETCH = 'STRETCH',
  CUSTOM = 'CUSTOM',
}

export class CreateStageDto {
  @ApiProperty({ enum: SessionStageType, description: 'Stage type' })
  @IsEnum(SessionStageType)
  type: SessionStageType;

  @ApiProperty({ description: 'Stage name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Stage name in Hebrew' })
  @IsString()
  @IsOptional()
  nameHe?: string;

  @ApiPropertyOptional({ description: 'Stage description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Stage description in Hebrew' })
  @IsString()
  @IsOptional()
  descriptionHe?: string;

  @ApiProperty({ description: 'Order index in the program' })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsInt()
  @IsOptional()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateStageDto {
  @ApiPropertyOptional({ enum: SessionStageType, description: 'Stage type' })
  @IsEnum(SessionStageType)
  @IsOptional()
  type?: SessionStageType;

  @ApiPropertyOptional({ description: 'Stage name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Stage name in Hebrew' })
  @IsString()
  @IsOptional()
  nameHe?: string;

  @ApiPropertyOptional({ description: 'Stage description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Stage description in Hebrew' })
  @IsString()
  @IsOptional()
  descriptionHe?: string;

  @ApiPropertyOptional({ description: 'Order index in the program' })
  @IsInt()
  @IsOptional()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsInt()
  @IsOptional()
  @Min(1)
  durationMinutes?: number;
}

export class AddExerciseToStageDto {
  @ApiProperty({ description: 'Exercise ID' })
  @IsString()
  exerciseId: string;

  @ApiProperty({ description: 'Order index in the stage' })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Custom repetitions' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customReps?: number;

  @ApiPropertyOptional({ description: 'Custom sets' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customSets?: number;

  @ApiPropertyOptional({ description: 'Custom duration in seconds' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customDuration?: number;

  @ApiPropertyOptional({ description: 'Notes for this exercise in the stage' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notes in Hebrew' })
  @IsString()
  @IsOptional()
  notesHe?: string;
}

export class UpdateStageExerciseDto {
  @ApiPropertyOptional({ description: 'Order index in the stage' })
  @IsInt()
  @IsOptional()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Custom repetitions' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customReps?: number;

  @ApiPropertyOptional({ description: 'Custom sets' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customSets?: number;

  @ApiPropertyOptional({ description: 'Custom duration in seconds' })
  @IsInt()
  @IsOptional()
  @Min(1)
  customDuration?: number;

  @ApiPropertyOptional({ description: 'Notes for this exercise' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notes in Hebrew' })
  @IsString()
  @IsOptional()
  notesHe?: string;
}

export class ReorderStagesDto {
  @ApiProperty({ description: 'Array of stage IDs in new order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  stageIds: string[];
}
