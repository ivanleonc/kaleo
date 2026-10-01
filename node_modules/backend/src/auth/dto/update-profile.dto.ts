import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Nombre del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'juan.nuevo@empresa.com', description: 'Nuevo email del usuario (requiere verificación)' })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://.../foto.png', description: 'URL de la foto de perfil' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar_url?: string;

  @ApiPropertyOptional({ example: 'Gerente Comercial', description: 'Cargo en la empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document_type?: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Número de documento' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document_number?: string;

  @ApiPropertyOptional({ example: 'America/Bogota', description: 'Zona horaria' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: 'es', description: 'Idioma (es, en)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
