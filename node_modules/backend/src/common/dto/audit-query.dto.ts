import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { LimitQueryDto } from './pagination-query.dto.js';

const CURSOR_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

/**
 * Consulta de auditoría paginada por cursor.
 *
 * No extiende `PaginationQueryDto` a propósito: `page` no significa nada sin
 * un total, y aceptarlo en silencio sugeriría un salto de página que el backend
 * no puede garantizar.
 */
export class AuditQueryDto extends LimitQueryDto {
  @ApiPropertyOptional({ example: 'User', description: 'Tipo de entidad' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ example: 'CREATE', description: 'Acción (coincidencia parcial)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  userId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  to?: string;

  @ApiPropertyOptional({
    description: 'Cursor base64url devuelto por la página anterior. Omitirlo devuelve la más reciente.',
    example: 'MjAyNi0wMS0wMVQwMDowMDowLjAwMHwxMjM0NTY3OC0xMjM0LTM0NTY3OC0xMjM0NTY3OC0xMjM0NTY3OA',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @Matches(CURSOR_PATTERN, { message: 'cursor no válido' })
  @MaxLength(200)
  cursor?: string;
}
