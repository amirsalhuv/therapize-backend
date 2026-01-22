import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ActiveExerciseDto } from './active-exercise.dto';

export class UpdateActiveExercisesDto {
  @ApiProperty({
    description: 'Array of active exercises for the patient plan',
    type: [ActiveExerciseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActiveExerciseDto)
  activeExercises: ActiveExerciseDto[];
}
