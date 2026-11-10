import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlanService } from './plan.service.js';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto.js';
import {
  SetPlanLimitsDto,
  SetPlanModulesDto,
} from './dto/set-plan-entitlements.dto.js';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto.js';
import { Ok } from '../../common/dto/api-response.dto.js';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard.js';
import { Audit } from '../../common/decorators/audit-context.decorator.js';

@ApiTags('Admin - Planes')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('api/admin')
export class PlanAdminController {
  constructor(private readonly plans: PlanService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planes con módulos y límites (super-admin)' })
  async list() {
    return Ok(await this.plans.list());
  }

  @Post('plans')
  @Audit({ entityType: 'Plan', resolveCreatedId: (response) => response?.data?.id })
  @ApiOperation({ summary: 'Crear un plan (super-admin)' })
  @ApiResponse({ status: 201, description: 'Plan creado' })
  @ApiResponse({ status: 409, description: 'Código de plan duplicado' })
  async create(@Body() dto: CreatePlanDto) {
    return Ok(await this.plans.create(dto), 'Plan creado');
  }

  @Put('plans/:id')
  @Audit({ entityType: 'Plan', idParam: 'id' })
  @ApiParam({ name: 'id', description: 'UUID del plan' })
  @ApiOperation({ summary: 'Actualizar datos generales de un plan' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return Ok(await this.plans.update(id, dto), 'Plan actualizado');
  }

  @Put('plans/:id/modules')
  @Audit({ entityType: 'Plan', idParam: 'id', skipDiff: true })
  @ApiParam({ name: 'id', description: 'UUID del plan' })
  @ApiOperation({ summary: 'Reemplazar los módulos incluidos en un plan' })
  async setModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPlanModulesDto,
  ) {
    return Ok(await this.plans.setModules(id, dto.moduleCodes), 'Módulos del plan actualizados');
  }

  @Put('plans/:id/limits')
  @Audit({ entityType: 'Plan', idParam: 'id', skipDiff: true })
  @ApiParam({ name: 'id', description: 'UUID del plan' })
  @ApiOperation({ summary: 'Reemplazar los límites de un plan' })
  async setLimits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPlanLimitsDto,
  ) {
    return Ok(await this.plans.setLimits(id, dto.limits), 'Límites del plan actualizados');
  }

  @Get('companies/:companyId/subscription')
  @ApiParam({ name: 'companyId', description: 'UUID de la empresa' })
  @ApiOperation({ summary: 'Suscripción actual de una empresa' })
  async getSubscription(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return Ok(await this.plans.getCompanySubscription(companyId));
  }

  @Put('companies/:companyId/subscription')
  @Audit({ entityType: 'Subscription', idParam: 'companyId', skipDiff: true })
  @ApiParam({ name: 'companyId', description: 'UUID de la empresa' })
  @ApiOperation({
    summary: 'Asignar plan o iniciar trial a una empresa',
    description:
      'Con status=trialing y sin currentPeriodEnd usa trial_days del plan. ' +
      'Reemplaza la suscripción vigente sin borrar datos.',
  })
  async assignSubscription(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return Ok(
      await this.plans.assignSubscription(companyId, dto),
      'Suscripción actualizada',
    );
  }
}
