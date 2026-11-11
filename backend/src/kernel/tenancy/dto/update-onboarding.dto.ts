import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ type: [String], description: 'Pasos completados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  completedSteps?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Módulos elegidos durante el onboarding' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  selectedModules?: string[];

  @ApiPropertyOptional({ description: 'Marca el onboarding como completado' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
