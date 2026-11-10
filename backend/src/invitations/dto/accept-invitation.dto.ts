import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Token recibido por email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'MiClaveSegura123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class AcceptExistingInvitationDto {
  @ApiProperty({ description: 'Token recibido por email' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
