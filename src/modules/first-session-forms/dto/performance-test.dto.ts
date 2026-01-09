import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceTestItemDto {
  @ApiProperty({ description: 'Name of the test' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test result' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiProperty({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PerformanceTestsDto {
  @ApiProperty({ type: [PerformanceTestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceTestItemDto)
  tests?: PerformanceTestItemDto[];
}
