import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoalItemDto {
  @ApiProperty({ description: 'Goal description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Target value (optional)' })
  @IsOptional()
  @IsString()
  targetValue?: string;

  @ApiProperty({ description: 'Target date (optional)' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class TherapyGoalsDto {
  @ApiProperty({ type: [GoalItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalItemDto)
  goals?: GoalItemDto[];

  @ApiProperty({ description: 'Selected program template ID' })
  @IsOptional()
  @IsUUID()
  selectedProgramId?: string;

  @ApiProperty({ description: 'Expected outcomes' })
  @IsOptional()
  @IsString()
  expectedOutcomes?: string;
}
