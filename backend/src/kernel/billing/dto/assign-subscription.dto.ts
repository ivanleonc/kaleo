import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AssignSubscriptionDto {
  @ApiProperty({ example: 'core' })
  @IsString()
  planCode!: string;

  @ApiPropertyOptional({
    enum: ['trialing', 'active', 'past_due', 'canceled', 'expired'],
    default: 'active',
  })
  @IsOptional()
  @IsIn(['trialing', 'active', 'past_due', 'canceled', 'expired'])
  status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

  @ApiPropertyOptional({
    example: 14,
    description: 'Solo para trialing. Si se omite usa el trial_days del plan.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Por defecto ahora' })
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}
