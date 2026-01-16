import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import {
  MilestoneStatus,
  MilestoneType,
  MilestoneTriggerType,
} from '@prisma/client';

export class CreateMilestoneDto {
  @ApiProperty({ enum: MilestoneType })
  @IsEnum(MilestoneType)
  type: MilestoneType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameHe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionHe?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(52)
  targetWeek: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiProperty({ enum: MilestoneTriggerType })
  @IsEnum(MilestoneTriggerType)
  triggerType: MilestoneTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameHe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionHe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  targetWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: MilestoneTriggerType })
  @IsOptional()
  @IsEnum(MilestoneTriggerType)
  triggerType?: MilestoneTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class CompleteMilestoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SkipMilestoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MilestoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  episodeId: string;

  @ApiPropertyOptional()
  templateId?: string;

  @ApiProperty({ enum: MilestoneType })
  type: MilestoneType;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  nameHe?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  descriptionHe?: string;

  @ApiProperty()
  targetWeek: number;

  @ApiPropertyOptional()
  targetDate?: Date;

  @ApiProperty({ enum: MilestoneStatus })
  status: MilestoneStatus;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty({ enum: MilestoneTriggerType })
  triggerType: MilestoneTriggerType;

  @ApiPropertyOptional()
  triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  linkedSessionId?: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional()
  therapistName?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TimelineMilestoneDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  nameHe?: string;

  @ApiProperty()
  week: number;

  @ApiProperty({ enum: MilestoneType })
  type: MilestoneType;

  @ApiProperty({ enum: MilestoneStatus })
  status: MilestoneStatus;

  @ApiPropertyOptional()
  targetDate?: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  descriptionHe?: string;

  @ApiPropertyOptional()
  therapistName?: string;

  @ApiPropertyOptional()
  episodeId?: string;
}

export class ProgramSummaryDto {
  @ApiProperty()
  episodeId: string;

  @ApiProperty()
  programName: string;

  @ApiProperty()
  therapistName: string;

  @ApiPropertyOptional()
  discipline?: string;

  @ApiProperty()
  currentWeek: number;

  @ApiProperty()
  totalWeeks: number;

  @ApiProperty()
  status: string;
}

export class TimelineResponseDto {
  @ApiProperty({ type: [ProgramSummaryDto] })
  programs: ProgramSummaryDto[];

  @ApiProperty({ type: [TimelineMilestoneDto] })
  milestones: TimelineMilestoneDto[];
}
