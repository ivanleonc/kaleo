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
import { AuditQueryDto } from '../../common/dto/audit-query.dto.js';
import {
  EXPORT_FORMATS,
  type ExportFormat,
} from '../../common/export/export.types.js';

const splitColumns = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const raw = Array.isArray(value) ? value : [value];
  const columns = raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return columns.length > 0 ? columns : undefined;
};

export class AuditExportQueryDto extends AuditQueryDto {
  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: 'csv' })
  @IsOptional()
  @IsIn(EXPORT_FORMATS, { message: 'format debe ser "csv" o "xlsx"' })
  format?: ExportFormat = 'csv';

  @ApiPropertyOptional({
    description: 'Ids de columnas visibles, separados por coma. Sin valor exporta todas.',
    example: 'created_at,action,entity_type',
  })
  @IsOptional()
  @Transform(splitColumns)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  columns?: string[];
}
