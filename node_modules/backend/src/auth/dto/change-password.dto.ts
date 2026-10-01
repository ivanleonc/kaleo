import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, IsString, Matches } from 'class-validator';

const PASSWORD_RULE = {
  message: 'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número',
};

export class ChangePasswordDto {
  @ApiProperty({ example: 'NuevaPassword456!', description: 'Nueva contraseña segura' })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(6, PASSWORD_RULE)
  @Matches(/[A-Z]/, PASSWORD_RULE)
  @Matches(/[a-z]/, PASSWORD_RULE)
  @Matches(/[0-9]/, PASSWORD_RULE)
  newPassword: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'Anterior123', description: 'Contraseña actual' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({ example: 'NuevaPassword456!', description: 'Nueva contraseña segura' })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(6, PASSWORD_RULE)
  @Matches(/[A-Z]/, PASSWORD_RULE)
  @Matches(/[a-z]/, PASSWORD_RULE)
  @Matches(/[0-9]/, PASSWORD_RULE)
  newPassword: string;
}
