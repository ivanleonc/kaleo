import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsIn, IsUUID, MaxLength, Min, Max } from 'class-validator';

export class LimitQueryDto {
  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export type SortDir = 'asc' | 'desc';

export class SortQueryDto extends LimitQueryDto {
  @ApiPropertyOptional({ example: 'name', description: 'Campo de orden. Solo se aceptan los campos de la whitelist del recurso.' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(30)
  sortBy?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['asc', 'desc'], { message: 'sortDir debe ser "asc" o "desc"' })
  sortDir?: SortDir;
}

export class PaginationQueryDto extends SortQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export class MemberQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'juan', description: 'Busca por nombre o email' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'El estado debe ser "active" o "inactive"' })
  status?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID del rol' })
  @IsOptional()
  @IsUUID('4', { message: 'roleId debe ser un UUID válido' })
  roleId?: string;
}

export class BranchQueryDto extends PaginationQueryDto {
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

export function normalizePagination(query: PaginationQueryDto): { page: number; limit: number; offset: number } {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export interface SortSpec {
  sortBy?: string;
  sortDir?: SortDir;
}

export function normalizeSort(query: SortSpec): { sortBy?: string; sortDir: SortDir } {
  return {
    sortBy: query.sortBy && query.sortBy.length > 0 ? query.sortBy : undefined,
    sortDir: query.sortDir === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Fragmento ORDER BY seguro para SQL crudo: la columna sale siempre de la
 * whitelist del recurso, nunca del query string del cliente. Claves
 * desconocidas (o intentos de inyección) caen al `fallback`.
 */
export function buildOrderBy(
  whitelist: Record<string, string>,
  sort: SortSpec,
  fallback: string,
): string {
  const key = (sort.sortBy ?? fallback).trim().toLowerCase();
  const column = whitelist[key] ?? whitelist[fallback] ?? Object.values(whitelist)[0];
  const dir = sort.sortDir === 'desc' ? 'DESC' : 'ASC';
  return `${column} ${dir}`;
}