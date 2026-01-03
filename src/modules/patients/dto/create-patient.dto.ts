import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePatientProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medicalRecordNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryDiagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
