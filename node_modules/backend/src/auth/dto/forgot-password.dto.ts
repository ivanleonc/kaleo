import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@empresa.com', description: 'Email registrado para recibir instrucciones de recuperación' })
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email: string;
}
