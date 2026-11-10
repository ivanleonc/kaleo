import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetFeatureFlagDto {
  @ApiProperty({ example: true, description: 'Activa o desactiva el flag' })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    example: 'Activa el nuevo módulo de APUs',
    description: 'Descripción opcional para administración',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
