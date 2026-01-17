import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Locale } from '@prisma/client';

export class UpdatePatientUserDto {
  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'User locale/language', enum: Locale, required: false })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
