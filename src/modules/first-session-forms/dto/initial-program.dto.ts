import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SelectedExerciseDto {
  @ApiProperty({ description: 'Exercise ID' })
  @IsString()
  exerciseId: string;

  @ApiProperty({ description: 'Order/position of exercise in the list' })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Custom repetitions for this exercise' })
  @IsOptional()
  @IsNumber()
  customReps?: number;

  @ApiProperty({ description: 'Custom sets for this exercise' })
  @IsOptional()
  @IsNumber()
  customSets?: number;

  @ApiProperty({ description: 'Custom duration in minutes for this exercise' })
  @IsOptional()
  @IsNumber()
  customDuration?: number;

  @ApiProperty({ description: 'Additional notes for this exercise' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InitialProgramDto {
  @ApiProperty({
    type: [SelectedExerciseDto],
    description: 'List of selected exercises for initial program',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedExerciseDto)
  exercises: SelectedExerciseDto[];
}
