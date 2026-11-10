import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { PlanLimitDto } from './plan.dto.js';

export class SetPlanModulesDto {
  @ApiProperty({ type: [String], example: ['core.users', 'construction.projects'] })
  @IsArray()
  @IsString({ each: true })
  moduleCodes!: string[];
}

export class SetPlanLimitsDto {
  @ApiProperty({ type: [PlanLimitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  limits!: PlanLimitDto[];
}
