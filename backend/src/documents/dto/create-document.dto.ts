import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ description: 'Título visible. Si falta se usa el nombre del archivo.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'contrato' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Tipo de entidad vinculada', example: 'analysis' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @ApiPropertyOptional({ description: 'UUID de la entidad vinculada' })
  @IsOptional()
  @IsString()
  entityId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';
}

export class CreateDocumentLinkDto {
  @ApiPropertyOptional({ example: 'analysis' })
  @IsString()
  @MaxLength(64)
  entityType!: string;

  @ApiPropertyOptional({ description: 'UUID de la entidad' })
  @IsString()
  entityId!: string;
}
