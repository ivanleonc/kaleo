import { BadRequestException, Body, Controller, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ModuleRegistryService } from './module-registry.service.js';
import { SetModuleDto } from './dto/set-module.dto.js';
import { SetModuleConfigDto } from './dto/set-module-config.dto.js';
import { Ok } from '../../common/dto/api-response.dto.js';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permissions } from '../../common/constants/permissions.js';
import { Audit } from '../../common/decorators/audit-context.decorator.js';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('api/modules')
export class ModuleRegistryController {
  constructor(private readonly moduleRegistry: ModuleRegistryService) {}

  @Get()
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Módulos habilitados para la empresa',
    description: 'Devuelve manifests y estado. Los módulos core siempre están activos.',
  })
  @ApiResponse({ status: 200, description: 'Lista de módulos habilitados' })
  @ApiResponse({ status: 400, description: 'Falta x-company-id' })
  async list(@Headers('x-company-id') companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(await this.moduleRegistry.getEnabledModules(companyId));
  }

  @Get('available')
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Módulos disponibles para la empresa, incluidos los desactivados',
    description: 'El onboarding lo usa para activar módulos incluidos en el plan.',
  })
  async available(@Headers('x-company-id') companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(await this.moduleRegistry.getAvailableModules(companyId));
  }

  @Get('catalog')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Catálogo completo de módulos (super-admin)' })
  @ApiResponse({ status: 200, description: 'Manifests registrados' })
  @ApiResponse({ status: 403, description: 'Se requiere super-administrador' })
  catalog() {
    return Ok(this.moduleRegistry.listCatalog());
  }

  @Put(':code/selection')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.COMPANY.UPDATE)
  @Audit({ entityType: 'Module', idParam: 'code', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'code', example: 'shared.documents' })
  @ApiOperation({
    summary: 'Activar o desactivar un módulo incluido en el plan',
    description: 'Solo aplica a módulos shared/pack; los core no se pueden desactivar.',
  })
  async select(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('code') code: string,
    @Body() dto: SetModuleDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(
      await this.moduleRegistry.setModuleEnabled(companyId, code, dto.enabled),
      'Módulo actualizado',
    );
  }

  @Put(':code')
  @UseGuards(SuperAdminGuard)
  @Audit({ entityType: 'Module', idParam: 'code', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa a configurar', required: true })
  @ApiParam({ name: 'code', example: 'construction.projects' })
  @ApiOperation({
    summary: 'Habilitar o deshabilitar un módulo de pack/shared',
    description: 'Valida dependencias y no permite tocar módulos core.',
  })
  @ApiResponse({ status: 200, description: 'Módulo actualizado' })
  @ApiResponse({ status: 400, description: 'Módulo core, dependencia faltante o dependientes activos' })
  async set(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('code') code: string,
    @Body() dto: SetModuleDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(await this.moduleRegistry.setModuleEnabled(companyId, code, dto.enabled));
  }

  @Get(':code/config')
  @UseGuards(SuperAdminGuard)
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'code', example: 'core.analyses' })
  @ApiOperation({ summary: 'Configuración JSON de un módulo para la empresa' })
  async getConfig(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('code') code: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.moduleRegistry.getModuleConfig(companyId, code));
  }

  @Put(':code/config')
  @UseGuards(SuperAdminGuard)
  @Audit({ entityType: 'Module', idParam: 'code', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'code', example: 'core.analyses' })
  @ApiOperation({ summary: 'Actualizar configuración JSON de un módulo' })
  async setConfig(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('code') code: string,
    @Body() dto: SetModuleConfigDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(
      await this.moduleRegistry.setModuleConfig(companyId, code, dto.config),
      'Configuración del módulo actualizada',
    );
  }
}
