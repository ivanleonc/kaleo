import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service.js';
import {
  AddApusToBudgetDto,
  CreateBudgetDto,
  CreateBudgetItemDto,
  UpdateBudgetDto,
  UpdateBudgetItemDto,
} from './dto/budget.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Budgets - Presupuestos')
@ApiBearerAuth()
@Controller('api')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get('projects/:projectId/budget')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Presupuesto del proyecto' })
  async getByProject(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.budgets.getByProject(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/budget')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear presupuesto del proyecto' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return Ok(
      await this.budgets.createBudget(
        requireCompany(companyId),
        userId,
        projectId,
        dto.apuBaseId,
      ),
      'Presupuesto creado',
    );
  }

  @Patch('budgets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar indirectos o nombre del presupuesto' })
  async update(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return Ok(
      await this.budgets.updateBudget(requireCompany(companyId), id, dto),
      'Presupuesto actualizado',
    );
  }

  @Post('budgets/:id/calculate')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Recalcular presupuesto' })
  async calculate(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.budgets.calculateBudget(requireCompany(companyId), id),
      'Presupuesto calculado',
    );
  }

  @Post('budgets/:id/approve')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_APPROVE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Aprobar y bloquear presupuesto' })
  async approve(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.budgets.approveBudget(requireCompany(companyId), userId, id),
      'Presupuesto aprobado',
    );
  }

  @Post('budgets/:id/items')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar capítulo o actividad manual' })
  async addItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetItemDto,
  ) {
    return Ok(
      await this.budgets.addItem(requireCompany(companyId), id, dto),
      'Actividad agregada',
    );
  }

  @Post('budgets/:id/items/from-apus')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar actividades desde APUs' })
  async addFromApus(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddApusToBudgetDto,
  ) {
    return Ok(
      await this.budgets.addFromApus(requireCompany(companyId), id, dto),
      'Actividades agregadas',
    );
  }

  @Patch('budgets/:id/items/:itemId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar actividad del presupuesto' })
  async updateItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateBudgetItemDto,
  ) {
    return Ok(
      await this.budgets.updateItem(requireCompany(companyId), id, itemId, dto),
      'Actividad actualizada',
    );
  }

  @Delete('budgets/:id/items/:itemId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar actividad del presupuesto' })
  async deleteItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return Ok(
      await this.budgets.deleteItem(requireCompany(companyId), id, itemId),
      'Actividad eliminada',
    );
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
