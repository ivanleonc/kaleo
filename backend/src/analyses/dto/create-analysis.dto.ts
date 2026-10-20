import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ANALYSIS_TYPES,
  MAX_ANALYSIS_FILE_BYTES,
  type AnalysisType,
} from '../types/analysis.types.js';

export class CreateAnalysisDto {
  @ApiProperty({ example: 'Facturación enero 2026', description: 'Nombre visible del análisis' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'energy', enum: ANALYSIS_TYPES, description: 'Tipo de análisis' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn([...ANALYSIS_TYPES], { message: 'El tipo de análisis no está soportado' })
  analysis_type: AnalysisType;

  @ApiPropertyOptional({ example: 'facturacion-enero.xlsx' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;

  @ApiPropertyOptional({ example: 245760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ANALYSIS_FILE_BYTES)
  file_size?: number;

  @ApiProperty({ description: 'Resultado normalizado del procesamiento, según analysis_type' })
  @IsObject()
  result: Record<string, unknown>;
}
