import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'usuario@empresa.com', description: 'Email del usuario que solicitó el reset' })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Token de recuperación recibido por email' })
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @ApiProperty({ example: 'NuevaPassword789!', description: 'Nueva contraseña (mínimo 6 caracteres)' })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}
