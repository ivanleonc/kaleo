import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAiRunDto {
  @ApiProperty({ example: 'core.ai.echo' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, { message: 'toolCode inválido' })
  toolCode!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
