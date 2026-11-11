import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ITEM_STATUSES, ITEM_TYPES, type ItemStatus, type ItemType } from '../items.types.js';

export class CreateItemCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class UpdateItemCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class ItemQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ITEM_TYPES })
  @IsOptional()
  @IsIn(ITEM_TYPES)
  itemType?: ItemType;

  @ApiPropertyOptional({ enum: ITEM_STATUSES })
  @IsOptional()
  @IsIn(ITEM_STATUSES)
  status?: ItemStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CreateCatalogItemDto {
  @ApiProperty({ example: 'CEM-001' })
  @IsString()
  @MaxLength(60)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({ enum: ITEM_TYPES })
  @IsIn(ITEM_TYPES)
  itemType!: ItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty()
  @IsUUID()
  unitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taxRateId?: string | null;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiProperty({ example: 0 })
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
  @IsBoolean()
  isStockable?: boolean;

  @ApiPropertyOptional({ enum: ITEM_STATUSES })
  @IsOptional()
  @IsIn(ITEM_STATUSES)
  status?: ItemStatus;
}

export class UpdateCatalogItemDto extends PartialType(CreateCatalogItemDto) {}

export class CreatePriceListDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ example: 'Lista general' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

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
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePriceListDto extends PartialType(CreatePriceListDto) {}

export class CreateItemPriceDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string | null;
}

export class UpdateItemPriceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string | null;
}
