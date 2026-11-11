import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PROJECT_ROLES,
  PROJECT_STATUSES,
  type ProjectRole,
  type ProjectStatus,
} from '../projects.types.js';

export class ProjectQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientPartyId?: string;

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

export class CreateProjectDto {
  @ApiProperty({ example: 'PRY-001' })
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
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'Presupuesto' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @ApiPropertyOptional({ description: 'URL de portada' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverUrl?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientPartyId?: string | null;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class AddProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: PROJECT_ROLES })
  @IsIn(PROJECT_ROLES)
  projectRole!: ProjectRole;
}

export class UpdateProjectMemberDto {
  @ApiProperty({ enum: PROJECT_ROLES })
  @IsIn(PROJECT_ROLES)
  projectRole!: ProjectRole;
}
