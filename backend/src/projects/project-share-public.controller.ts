import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProjectSharesService } from './project-shares.service.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('Projects - Portal compartido')
@Controller('api/public/shares')
export class ProjectSharePublicController {
  constructor(private readonly shares: ProjectSharesService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':token')
  @ApiParam({ name: 'token', description: 'Token del enlace compartido' })
  @ApiOperation({ summary: 'Ver proyecto compartido (solo lectura, sin autenticación)' })
  async view(@Param('token') token: string) {
    return Ok(await this.shares.resolvePublic(token));
  }
}
