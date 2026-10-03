import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray, IsOptional, IsUUID, MaxLength } from 'class-validator';

/**
 * Asignar un usuario (existente o nuevo) a una empresa explícita.
 *
 * A diferencia de AddMemberDto (que opera sobre la empresa del header),
 * este DTO se usa con `POST /api/companies/:id/members` donde la empresa
 * destino viene en el path. Se requiere `userId` o `email` (al menos uno);
 * si el usuario no existe se crea (entonces `name` es obligatorio).
 * Los roles son obligatorios y deben pertenecer a la empresa destino
 * (o ser globales).
 */
export class AttachMemberDto {
  @ApiPropertyOptional({ description: 'UUID del usuario existente. Si se omite, se busca/crea por email.' })
  @IsOptional()
  @IsUUID(undefined, { message: 'El userId debe ser un UUID válido' })
  userId?: string;

  @ApiPropertyOptional({ example: 'juan@empresa.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Obligatorio solo si el usuario no existe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'IDs de roles a asignar en la empresa destino (globales o de esa empresa)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'Cada roleId debe ser un UUID válido' })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Nombres de roles a resolver dentro de la empresa destino (alternativa a roleIds; útil para asignar el mismo rol en varias empresas con IDs distintos)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Vendedor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}
