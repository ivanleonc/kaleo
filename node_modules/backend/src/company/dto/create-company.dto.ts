import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Mi Empresa S.A.', description: 'Nombre de la empresa (mínimo 2 caracteres)' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '12345678-9', description: 'RUT o identificador fiscal (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @ApiPropertyOptional({ example: 'https://.../logo.png', description: 'URL del logo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ example: '+57 601 123 4567', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'contacto@empresa.com', description: 'Email de contacto' })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email es inválido' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67', description: 'Dirección fiscal' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Bogotá', description: 'Ciudad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Cundinamarca', description: 'Estado o departamento' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Colombia', description: 'País' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '110111', description: 'Código postal' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  @ApiPropertyOptional({ example: 'America/Bogota', description: 'Zona horaria' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: 'mi-empresa', description: 'Identificador corto único' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'El slug solo admite minúsculas, números y guiones' })
  slug?: string;
}
