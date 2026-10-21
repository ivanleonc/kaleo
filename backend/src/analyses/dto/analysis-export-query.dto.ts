import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExportQueryDto } from '../../common/export/export-query.dto.js';
import { ANALYSIS_TYPES, type AnalysisType } from '../types/analysis.types.js';

export class AnalysisExportQueryDto extends ExportQueryDto {
  @ApiPropertyOptional({ example: 'enero', description: 'Busca por nombre o archivo' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'energy', enum: ANALYSIS_TYPES })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn([...ANALYSIS_TYPES], { message: 'El tipo de análisis no está soportado' })
  analysis_type?: AnalysisType;
}
