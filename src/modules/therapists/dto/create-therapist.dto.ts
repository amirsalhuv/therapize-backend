import { IsString, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTherapistProfileDto {
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
}
