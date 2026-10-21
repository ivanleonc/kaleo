import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExportQueryDto } from '../../common/export/export-query.dto.js';

export class BranchExportQueryDto extends ExportQueryDto {
  @ApiPropertyOptional({ example: 'centro', description: 'Busca por nombre, ciudad, departamento o país' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'El estado debe ser "active" o "inactive"' })
  status?: string;
}
