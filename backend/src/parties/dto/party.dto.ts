import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PARTY_IDENTITY_KINDS,
  PARTY_ROLES,
  PARTY_STATUSES,
  PARTY_TYPES,
  type PartyIdentityKind,
  type PartyRole,
  type PartyStatus,
  type PartyType,
} from '../parties.types.js';

export class PartyIdentityDto {
  @ApiProperty({ enum: PARTY_IDENTITY_KINDS })
  @IsIn(PARTY_IDENTITY_KINDS)
  kind!: PartyIdentityKind;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class CreatePartyDto {
  @ApiProperty({ enum: PARTY_TYPES })
  @IsIn(PARTY_TYPES)
  partyType!: PartyType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ type: [String], enum: PARTY_ROLES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PARTY_ROLES.length)
  @IsIn(PARTY_ROLES, { each: true })
  roles?: PartyRole[];

  @ApiPropertyOptional({ type: [PartyIdentityDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PartyIdentityDto)
  identities?: PartyIdentityDto[];
}

export class UpdatePartyDto {
  @ApiPropertyOptional({ enum: PARTY_TYPES })
  @IsOptional()
  @IsIn(PARTY_TYPES)
  partyType?: PartyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ enum: PARTY_STATUSES })
  @IsOptional()
  @IsIn(PARTY_STATUSES)
  status?: PartyStatus;
}

export class AddPartyRoleDto {
  @ApiProperty({ enum: PARTY_ROLES })
  @IsIn(PARTY_ROLES)
  role!: PartyRole;
}

export class CreatePartyContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdatePartyContactDto extends PartialType(CreatePartyContactDto) {}

export class CreatePartyAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdatePartyAddressDto extends PartialType(CreatePartyAddressDto) {}

export class PartyQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: PARTY_TYPES })
  @IsOptional()
  @IsIn(PARTY_TYPES)
  partyType?: PartyType;

  @ApiPropertyOptional({ enum: PARTY_ROLES })
  @IsOptional()
  @IsIn(PARTY_ROLES)
  role?: PartyRole;

  @ApiPropertyOptional({ enum: PARTY_STATUSES })
  @IsOptional()
  @IsIn(PARTY_STATUSES)
  status?: PartyStatus;

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

  @ApiPropertyOptional({ enum: ['name', 'party_type', 'status', 'created_at', 'updated_at'] })
  @IsOptional()
  @IsIn(['name', 'party_type', 'status', 'created_at', 'updated_at'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
