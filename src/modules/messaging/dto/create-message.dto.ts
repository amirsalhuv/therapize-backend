import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageContentType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ description: 'Thread ID to send message to' })
  @IsString()
  threadId: string;

  @ApiPropertyOptional({ description: 'Text content of the message' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: MessageContentType, default: MessageContentType.TEXT })
  @IsOptional()
  @IsEnum(MessageContentType)
  contentType?: MessageContentType;

  @ApiPropertyOptional({ description: 'URL of the uploaded file' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'MIME type of the file' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL for images/videos' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds for voice/video' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  durationSeconds?: number;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Number of messages to return', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Cursor for pagination (message ID)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
