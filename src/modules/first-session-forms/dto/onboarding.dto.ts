import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class OnboardingDto {
  @ApiProperty({ description: 'Patient understands how to rate exercises' })
  @IsOptional()
  @IsBoolean()
  ratingExercises?: boolean;

  @ApiProperty({ description: 'Patient understands adherence tracking' })
  @IsOptional()
  @IsBoolean()
  adherenceTracking?: boolean;

  @ApiProperty({ description: 'Patient understands app usage' })
  @IsOptional()
  @IsBoolean()
  appUsage?: boolean;

  @ApiProperty({ description: 'Additional onboarding notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
