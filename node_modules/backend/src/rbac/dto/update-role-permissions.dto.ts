import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiPropertyOptional({ example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'], description: 'UUIDs completos de permisos para el rol' })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}
