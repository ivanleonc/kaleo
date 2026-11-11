import { BadRequestException, Body, Controller, Get, Headers, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanySettingsService } from './company-settings.service.js';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto.js';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto.js';
import { Ok } from '../../common/dto/api-response.dto.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permissions } from '../../common/constants/permissions.js';
import { Audit } from '../../common/decorators/audit-context.decorator.js';

@ApiTags('Company settings')
@ApiBearerAuth()
@Controller('api/company-settings')
export class CompanySettingsController {
  constructor(private readonly settings: CompanySettingsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.COMPANY.READ)
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({ summary: 'Configuración regional de la empresa' })
  @ApiResponse({ status: 200, description: 'Configuración de la empresa' })
  async get(@Headers('x-company-id') companyId?: string) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.settings.get(companyId));
  }

  @Get('onboarding')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.COMPANY.READ)
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({ summary: 'Estado del onboarding de la empresa' })
  async getOnboarding(@Headers('x-company-id') companyId?: string) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.settings.getOnboarding(companyId));
  }

  @Put('onboarding')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.COMPANY.UPDATE)
  @Audit({ entityType: 'Settings', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({ summary: 'Actualizar el progreso del onboarding' })
  async updateOnboarding(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: UpdateOnboardingDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(
      await this.settings.updateOnboarding(companyId, dto),
      'Onboarding actualizado',
    );
  }

  @Put()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.COMPANY.UPDATE)
  @Audit({ entityType: 'Settings', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({ summary: 'Actualizar configuración regional de la empresa' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async update(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.settings.update(companyId, dto), 'Configuración actualizada');
  }
}
