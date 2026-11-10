import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetModuleDto {
  @ApiProperty({ example: true, description: 'Habilita o deshabilita el módulo para la empresa' })
  @IsBoolean()
  enabled!: boolean;
}
