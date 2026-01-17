import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFamilyMemberDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  canStartSessions?: boolean;
}
