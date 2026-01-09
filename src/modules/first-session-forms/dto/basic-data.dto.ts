import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class BasicDataDto {
  @ApiProperty({ description: 'Patient age', minimum: 0, maximum: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  age?: number;

  @ApiProperty({ description: 'Height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiProperty({ description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ description: 'Medical history notes' })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ description: 'List of current medications', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({ description: 'List of known allergies', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ description: 'Previous treatments description' })
  @IsOptional()
  @IsString()
  previousTreatments?: string;
}
