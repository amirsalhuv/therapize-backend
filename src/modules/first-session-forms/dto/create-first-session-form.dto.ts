import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateFirstSessionFormDto {
  @ApiProperty({ description: 'Program episode ID' })
  @IsUUID()
  episodeId: string;
}
