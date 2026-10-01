import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nuevo@empresa.com', description: 'Email del nuevo usuario' })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email: string;

  @ApiProperty({ example: 'Segura123!', description: 'Contraseña (mínimo 8 caracteres, una mayúscula, una minúscula y un número)' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/, { message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número.' })
  password: string;

  @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Nombre completo del usuario' })
  @IsOptional()
  @IsString()
  name?: string;
}
