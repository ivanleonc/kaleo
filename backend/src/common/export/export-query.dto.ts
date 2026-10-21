import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { SortDir } from '../dto/pagination-query.dto.js';
import { EXPORT_FORMATS, type ExportFormat } from './export.types.js';

const splitColumns = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const raw = Array.isArray(value) ? value : [value];
  const columns = raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return columns.length > 0 ? columns : undefined;
};

/**
 * Parámetros comunes de exportación. No extiende `PaginationQueryDto` a
 * propósito: una exportación ignora `page`/`limit` y aceptarlo en silencio
 * sugeriría que se puede paginar el archivo.
 */
export class ExportQueryDto {
  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: 'csv' })
  @IsOptional()
  @IsIn(EXPORT_FORMATS, { message: 'format debe ser "csv" o "xlsx"' })
  format?: ExportFormat = 'csv';

  @ApiPropertyOptional({
    description: 'Ids de columnas visibles, separados por coma. Sin valor exporta todas.',
    example: 'name,email,status',
  })
  @IsOptional()
  @Transform(splitColumns)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  columns?: string[];

  @ApiPropertyOptional({ example: 'name' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(30)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['asc', 'desc'], { message: 'sortDir debe ser "asc" o "desc"' })
  sortDir?: SortDir;
}
