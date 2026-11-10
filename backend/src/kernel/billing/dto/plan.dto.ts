import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlanLimitDto {
  @ApiProperty({ example: 'core.users' })
  @IsString()
  moduleCode!: string;

  @ApiProperty({ example: 'max_active' })
  @IsString()
  featureCode!: string;

  @ApiPropertyOptional({ example: 50, nullable: true, description: 'null = ilimitado' })
  @IsOptional()
  @IsNumber()
  limitValue?: number | null;

  @ApiProperty({ enum: ['none', 'month', 'year'], example: 'none' })
  @IsIn(['none', 'month', 'year'])
  period!: 'none' | 'month' | 'year';

  @ApiProperty({ example: true })
  @IsBoolean()
  isHard!: boolean;

  @ApiPropertyOptional({ enum: ['usage', 'gauge'], example: 'gauge' })
  @IsOptional()
  @IsIn(['usage', 'gauge'])
  limitKind?: 'usage' | 'gauge';
}

export class CreatePlanDto {
  @ApiProperty({ example: 'construction' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'code inválido' })
  code!: string;

  @ApiProperty({ example: 'Construcción' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 14, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ enum: ['month', 'year'], default: 'month' })
  @IsOptional()
  @IsIn(['month', 'year'])
  billingInterval?: 'month' | 'year';

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'COP', default: 'COP' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode debe tener 3 letras mayúsculas' })
  currencyCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['core.users', 'construction.projects'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({ type: [PlanLimitDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  limits?: PlanLimitDto[];
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ enum: ['month', 'year'] })
  @IsOptional()
  @IsIn(['month', 'year'])
  billingInterval?: 'month' | 'year';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode debe tener 3 letras mayúsculas' })
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
