import { IsString, IsOptional, IsInt, IsArray, IsBoolean, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATEGORIES } from '../../../common/constants/therapy-reference';

export class CreateExerciseDto {
  @ApiProperty({ description: 'Exercise name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Exercise name in Hebrew' })
  @IsString()
  @IsOptional()
  nameHe?: string;

  @ApiPropertyOptional({ description: 'Exercise description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Exercise description in Hebrew' })
  @IsString()
  @IsOptional()
  descriptionHe?: string;

  @ApiPropertyOptional({ description: 'Exercise instructions' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Exercise instructions in Hebrew' })
  @IsString()
  @IsOptional()
  instructionsHe?: string;

  @ApiPropertyOptional({ description: 'Purpose/benefit of the exercise' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Purpose/benefit in Hebrew' })
  @IsString()
  @IsOptional()
  purposeHe?: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media type (video/image)' })
  @IsString()
  @IsOptional()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Preview image URL' })
  @IsString()
  @IsOptional()
  previewImageUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsInt()
  @IsOptional()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Number of repetitions' })
  @IsInt()
  @IsOptional()
  @Min(1)
  repetitions?: number;

  @ApiPropertyOptional({ description: 'Number of sets' })
  @IsInt()
  @IsOptional()
  @Min(1)
  sets?: number;

  @ApiPropertyOptional({
    description: 'Exercise category',
    enum: CATEGORIES.map((c) => c.en),
  })
  @IsString()
  @IsOptional()
  @IsIn(CATEGORIES.map((c) => c.en), {
    message: `Category must be one of: ${CATEGORIES.map((c) => c.en).join(', ')}`,
  })
  category?: string;

  @ApiPropertyOptional({ description: 'Difficulty level (1-5)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: 'Body parts targeted', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bodyParts?: string[];

  @ApiPropertyOptional({ description: 'Add to shared library' })
  @IsBoolean()
  @IsOptional()
  isLibraryExercise?: boolean;
}
