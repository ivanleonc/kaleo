import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsArray, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del miembro' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'juan@empresa.com', description: 'Email del miembro' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email: string;

  @ApiPropertyOptional({ description: 'IDs de roles a asignar (si se omite, se asigna Admin por defecto)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ example: '+57 300 123 4567', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Vendedor', description: 'Cargo en la empresa' })
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
}
