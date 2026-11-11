import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  APU_STATUSES,
  RESOURCE_TYPES,
  type ApuStatus,
  type ResourceType,
} from '../estimating.types.js';

export class ResourceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: RESOURCE_TYPES })
  @IsOptional()
  @IsIn(RESOURCE_TYPES)
  resourceType?: ResourceType;
}

export class CreateResourceDto {
  @ApiProperty({ enum: RESOURCE_TYPES })
  @IsIn(RESOURCE_TYPES)
  resourceType!: ResourceType;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty()
  @IsUUID()
  unitId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseCost!: number;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  catalogItemId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}

export class CreateResourcePriceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierPartyId?: string | null;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string | null;
}

export class CreateApuBaseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  source?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateApuBaseDto extends PartialType(CreateApuBaseDto) {}

export class ApuQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  baseId?: string;
}

export class CreateApuDto {
  @ApiProperty()
  @IsUUID()
  baseId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty()
  @IsUUID()
  unitId!: string;

  @ApiPropertyOptional({ enum: APU_STATUSES })
  @IsOptional()
  @IsIn(APU_STATUSES)
  status?: ApuStatus;
}

export class UpdateApuDto extends PartialType(CreateApuDto) {}

export class CreateApuLineDto {
  @ApiProperty()
  @IsUUID()
  resourceId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wastePct?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  performance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class UpdateApuLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wastePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  performance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
