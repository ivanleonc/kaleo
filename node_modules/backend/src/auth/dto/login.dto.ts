import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@empresa.com', description: 'Email del usuario' })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email: string;

  @ApiProperty({ example: 'MiPassword123', description: 'Contraseña del usuario' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;
}
