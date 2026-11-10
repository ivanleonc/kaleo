import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ExportRequestDto {
  @ApiProperty({ enum: ['csv', 'xlsx'], example: 'csv' })
  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  filters?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}

export class ReportRequestDto {
  @ApiProperty({ enum: ['csv', 'xlsx'], example: 'xlsx' })
  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';
}
