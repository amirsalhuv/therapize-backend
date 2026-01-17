import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GoalItemDto } from './therapy-goals.dto';

export class UpdateGoalsDto {
  @ApiProperty({ type: [GoalItemDto], description: 'Updated list of therapy goals' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalItemDto)
  goals: GoalItemDto[];
}
