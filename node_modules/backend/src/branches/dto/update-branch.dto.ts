import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBranchDto } from './create-branch.dto.js';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Marcar como sede principal (solo una por empresa)' })
  @IsOptional()
  @IsBoolean()
  is_main?: boolean;
}
