import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SHARE_SCOPES, type ShareScope } from '../project-shares.repository.js';

export class CreateShareLinkDto {
  @ApiPropertyOptional({ description: 'Etiqueta interna del enlace' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @ApiPropertyOptional({
    enum: SHARE_SCOPES,
    description: 'summary: solo totales; budget: incluye actividades',
  })
  @IsOptional()
  @IsIn(SHARE_SCOPES)
  scope?: ShareScope;

  @ApiPropertyOptional({
    description: 'Días de validez (1-365). Null o ausente usa 30 días.',
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number | null;
}
