import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UNIT_KINDS, type UnitKind } from '../catalog.types.js';

export class UnitQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: UNIT_KINDS })
  @IsOptional()
  @IsIn(UNIT_KINDS)
  kind?: UnitKind;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: string;
}

export class CreateUnitDto {
  @ApiProperty({ example: 'm2' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: 'Metro cuadrado' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: UNIT_KINDS })
  @IsIn(UNIT_KINDS)
  kind!: UnitKind;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  precision?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

export class CreateUnitConversionDto {
  @ApiProperty()
  @IsUUID()
  toUnitId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.00000001)
  factor!: number;
}

export class TaxRateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: string;
}

export class CreateTaxRateDto {
  @ApiProperty({ example: 'iva-19' })
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ example: 'IVA 19%' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 19 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rate!: number;

  @ApiPropertyOptional({ example: 'CO' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}
