import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsUUID, MaxLength, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Gestor de Finanzas', description: 'Nombre del rol' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Acceso solo a reportes financieros', description: 'Descripcion del rol' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#8b5cf6', description: 'Color del rol en hexadecimal' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe ser hexadecimal (#rrggbb)' })
  color?: string;

  @ApiPropertyOptional({ example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'], description: 'UUIDs de permisos a asignar al rol' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  permissionIds?: string[];
}
