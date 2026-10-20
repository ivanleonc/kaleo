import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAnalysisDto {
  @ApiProperty({ example: 'Facturación enero 2026', description: 'Nuevo nombre del análisis' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(160)
  name: string;
}
