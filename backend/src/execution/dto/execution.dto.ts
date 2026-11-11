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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  MOVEMENT_TYPES,
  PAYROLL_STATUSES,
  PURCHASE_ORDER_STATUSES,
  SCHEDULE_STATUSES,
  type ContractStatus,
  type ContractType,
  type MovementType,
  type PayrollStatus,
  type PurchaseOrderStatus,
  type ScheduleStatus,
} from '../execution.types.js';

export class ProjectQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class CreateScheduleActivityDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  predecessorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  budgetItemId?: string | null;

  @ApiPropertyOptional({ enum: SCHEDULE_STATUSES })
  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: ScheduleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateScheduleActivityDto extends PartialType(CreateScheduleActivityDto) {}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ enum: CONTRACT_TYPES })
  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: ContractType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: CONTRACT_STATUSES })
  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateContractDto extends PartialType(CreateContractDto) {}

export class CreatePayrollEntryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  workerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membershipId?: string | null;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional({ enum: PAYROLL_STATUSES })
  @IsOptional()
  @IsIn(PAYROLL_STATUSES)
  status?: PayrollStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdatePayrollEntryDto extends PartialType(CreatePayrollEntryDto) {}

export class CreateWarehouseDto {
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
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  resourceId!: string;

  @ApiProperty({ enum: MOVEMENT_TYPES })
  @IsIn(MOVEMENT_TYPES)
  movementType!: MovementType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class PurchaseOrderLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resourceId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierPartyId?: string | null;

  @ApiProperty({ example: 'COP' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional({ enum: PURCHASE_ORDER_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_ORDER_STATUSES)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierPartyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @ApiPropertyOptional({ enum: PURCHASE_ORDER_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_ORDER_STATUSES)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
