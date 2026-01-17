import { IsString, IsOptional, IsEmail, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FamilyRelationship {
  PARENT = 'PARENT',
  SPOUSE = 'SPOUSE',
  CHILD = 'CHILD',
  SIBLING = 'SIBLING',
  GRANDPARENT = 'GRANDPARENT',
  CAREGIVER = 'CAREGIVER',
}

export class CreateFamilyMemberInvitationDto {
  @ApiProperty({ example: 'patient-profile-uuid' })
  @IsString()
  patientProfileId: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: FamilyRelationship, example: FamilyRelationship.PARENT })
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;

  @ApiProperty({ example: 'jane@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 7, required: false, description: 'Expiration in days (default: 7)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expirationDays?: number;
}
