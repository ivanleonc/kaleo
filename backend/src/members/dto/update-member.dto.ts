import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AddMemberDto } from './add-member.dto.js';

class UpdatableMemberFields extends PartialType(OmitType(AddMemberDto, ['name', 'email'] as const)) {}

export class UpdateMemberDto extends UpdatableMemberFields {
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'], description: 'Estado de la cuenta' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'], { message: 'El estado debe ser "active" o "inactive"' })
  status?: string;
}
