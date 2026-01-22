import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BasicDataDto } from './basic-data.dto';
import { PerformanceTestsDto } from './performance-test.dto';
import { TherapyGoalsDto } from './therapy-goals.dto';
import { OnboardingDto } from './onboarding.dto';
import { InitialProgramDto } from './initial-program.dto';

export class UpdateFirstSessionFormDto {
  @ApiProperty({ type: BasicDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasicDataDto)
  basicData?: BasicDataDto;

  @ApiProperty({ type: PerformanceTestsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceTestsDto)
  performanceTests?: PerformanceTestsDto;

  @ApiProperty({ type: TherapyGoalsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TherapyGoalsDto)
  therapyGoals?: TherapyGoalsDto;

  @ApiProperty({ type: OnboardingDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingDto)
  onboarding?: OnboardingDto;

  @ApiProperty({ type: InitialProgramDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialProgramDto)
  initialProgram?: InitialProgramDto;
}
