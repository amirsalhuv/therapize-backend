import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TherapyDiscipline } from '@prisma/client';

export class CreateTherapistProfileDto {
  @ApiProperty({ enum: TherapyDiscipline, required: false })
  @IsOptional()
  @IsEnum(TherapyDiscipline)
  discipline?: TherapyDiscipline;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseState?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  yearsOfExperience?: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isLeadTherapist?: boolean;

  @ApiProperty({ example: 'Israel', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Tel Aviv', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  acceptingNewPatients?: boolean;
}
