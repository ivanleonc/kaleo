import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token a invalidar (opcional, si no se provee solo se invalida el accessToken)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
