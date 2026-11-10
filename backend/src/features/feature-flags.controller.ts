import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service.js';
import { SetFeatureFlagDto } from './dto/set-feature-flag.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Features')
@ApiBearerAuth()
@Controller('api/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Listar feature flags de la empresa activa',
    description: 'Devuelve un mapa flag → booleano para que el frontend adapte la UI.',
  })
  @ApiResponse({ status: 200, description: 'Mapa de flags de la empresa' })
  @ApiResponse({ status: 400, description: 'Falta x-company-id' })
  async list(@Headers('x-company-id') companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    return Ok(await this.featureFlagsService.enabledMap(companyId));
  }

  @Put(':flag')
  @UseGuards(SuperAdminGuard)
  @Audit({ entityType: 'Settings', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa a configurar', required: true })
  @ApiParam({ name: 'flag', example: 'construction.apus_v2' })
  @ApiOperation({
    summary: 'Activar o desactivar un feature flag',
    description: 'Solo super-administradores. La escritura queda auditada.',
  })
  @ApiResponse({ status: 200, description: 'Flag actualizado' })
  @ApiResponse({ status: 400, description: 'Flag inválido o falta x-company-id' })
  @ApiResponse({ status: 403, description: 'Se requiere super-administrador' })
  async set(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('flag') flag: string,
    @Body() dto: SetFeatureFlagDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    if (!/^[a-z0-9][a-z0-9_.-]{1,99}$/.test(flag)) {
      throw new BadRequestException(
        'Flag inválido: usa minúsculas, números, punto, guion o guion bajo',
      );
    }

    const updated = await this.featureFlagsService.set(
      companyId,
      flag,
      dto.enabled,
      dto.description ?? null,
    );
    return Ok(updated, 'Feature flag actualizado');
  }
}
