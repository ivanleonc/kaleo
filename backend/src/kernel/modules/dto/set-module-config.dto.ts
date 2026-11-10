import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SetModuleConfigDto {
  @ApiProperty({
    description: 'Configuración JSON del módulo para la empresa',
    example: { threshold: 10 },
  })
  @IsObject()
  config!: Record<string, unknown>;
}
