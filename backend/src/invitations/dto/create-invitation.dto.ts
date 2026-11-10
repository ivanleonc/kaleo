import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'persona@empresa.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ type: [String], example: ['uuid-del-rol'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
