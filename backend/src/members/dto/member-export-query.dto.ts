import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ExportQueryDto } from '../../common/export/export-query.dto.js';

export class MemberExportQueryDto extends ExportQueryDto {
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

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID('4', { message: 'roleId debe ser un UUID válido' })
  roleId?: string;
}
