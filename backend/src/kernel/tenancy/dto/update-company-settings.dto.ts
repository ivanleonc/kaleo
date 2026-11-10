import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, Matches } from 'class-validator';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'COP', description: 'Código ISO 4217 de 3 letras' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode debe ser un código ISO de 3 letras' })
  currencyCode?: string;

  @ApiPropertyOptional({ example: 'es-CO', description: 'Locale BCP 47 simple, ej. es-CO' })
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'locale inválido, ej. es-CO' })
  locale?: string;

  @ApiPropertyOptional({ description: 'Configuración extensible por módulo' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
