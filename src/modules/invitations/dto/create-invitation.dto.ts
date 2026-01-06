import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AgeRange {
  CHILD = 'CHILD',
  TEEN = 'TEEN',
  ADULT = 'ADULT',
  SENIOR = 'SENIOR',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export class CreateInvitationDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ enum: AgeRange, required: false })
  @IsOptional()
  @IsEnum(AgeRange)
  ageRange?: AgeRange;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'Experiencing chronic back pain', required: false })
  @IsOptional()
  @IsString()
  conditionDescription?: string;

  @ApiProperty({ example: 7, required: false, description: 'Expiration in days (default: 7)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expirationDays?: number;
}
