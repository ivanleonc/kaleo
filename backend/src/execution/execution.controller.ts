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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ExecutionService } from './execution.service.js';
import {
  CreateContractDto,
  CreatePayrollEntryDto,
  CreatePurchaseOrderDto,
  CreateScheduleActivityDto,
  CreateStockMovementDto,
  CreateWarehouseDto,
  ProjectQueryDto,
  UpdateContractDto,
  UpdatePayrollEntryDto,
  UpdatePurchaseOrderDto,
  UpdateScheduleActivityDto,
  UpdateWarehouseDto,
} from './dto/execution.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Execution - Ejecución de obra')
@ApiBearerAuth()
@Controller('api')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class ExecutionController {
  constructor(private readonly execution: ExecutionService) {}

  // ─── Programación ─────────────────────────────────────────────────────────
  @Get('projects/:projectId/schedule')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Cronograma del proyecto' })
  async listSchedule(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.execution.listSchedule(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/schedule')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear actividad del cronograma' })
  async createScheduleActivity(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateScheduleActivityDto,
  ) {
    return Ok(
      await this.execution.createScheduleActivity(
        requireCompany(companyId),
        userId,
        projectId,
        dto,
      ),
      'Actividad creada',
    );
  }

  @Patch('schedule/:id')
  @RequirePermissions(Permissions.EXECUTION.UPDATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar actividad del cronograma' })
  async updateScheduleActivity(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleActivityDto,
  ) {
    return Ok(
      await this.execution.updateScheduleActivity(requireCompany(companyId), id, dto),
      'Actividad actualizada',
    );
  }

  @Delete('schedule/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar actividad del cronograma' })
  async deleteScheduleActivity(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deleteScheduleActivity(requireCompany(companyId), id);
    return Ok(undefined, 'Actividad eliminada');
  }

  // ─── Contratos ────────────────────────────────────────────────────────────
  @Get('projects/:projectId/contracts')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Contratos del proyecto' })
  async listContracts(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.execution.listContracts(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/contracts')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear contrato' })
  async createContract(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateContractDto,
  ) {
    return Ok(
      await this.execution.createContract(requireCompany(companyId), userId, projectId, dto),
      'Contrato creado',
    );
  }

  @Patch('contracts/:id')
  @RequirePermissions(Permissions.EXECUTION.UPDATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar contrato' })
  async updateContract(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return Ok(
      await this.execution.updateContract(requireCompany(companyId), id, dto),
      'Contrato actualizado',
    );
  }

  @Delete('contracts/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar contrato' })
  async deleteContract(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deleteContract(requireCompany(companyId), id);
    return Ok(undefined, 'Contrato eliminado');
  }

  // ─── Nómina ───────────────────────────────────────────────────────────────
  @Get('projects/:projectId/payroll')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Nómina del proyecto' })
  async listPayroll(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.execution.listPayroll(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/payroll')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear registro de nómina' })
  async createPayrollEntry(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePayrollEntryDto,
  ) {
    return Ok(
      await this.execution.createPayrollEntry(requireCompany(companyId), userId, projectId, dto),
      'Registro creado',
    );
  }

  @Patch('payroll/:id')
  @RequirePermissions(Permissions.EXECUTION.UPDATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar registro de nómina' })
  async updatePayrollEntry(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollEntryDto,
  ) {
    return Ok(
      await this.execution.updatePayrollEntry(requireCompany(companyId), id, dto),
      'Registro actualizado',
    );
  }

  @Delete('payroll/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar registro de nómina' })
  async deletePayrollEntry(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deletePayrollEntry(requireCompany(companyId), id);
    return Ok(undefined, 'Registro eliminado');
  }

  // ─── Almacén ──────────────────────────────────────────────────────────────
  @Get('warehouses')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Almacenes' })
  async listWarehouses(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: ProjectQueryDto,
  ) {
    return Ok(await this.execution.listWarehouses(requireCompany(companyId), query.projectId));
  }

  @Post('warehouses')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear almacén' })
  async createWarehouse(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateWarehouseDto,
  ) {
    return Ok(
      await this.execution.createWarehouse(requireCompany(companyId), dto),
      'Almacén creado',
    );
  }

  @Patch('warehouses/:id')
  @RequirePermissions(Permissions.EXECUTION.UPDATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar almacén' })
  async updateWarehouse(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return Ok(
      await this.execution.updateWarehouse(requireCompany(companyId), id, dto),
      'Almacén actualizado',
    );
  }

  @Delete('warehouses/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar almacén' })
  async deleteWarehouse(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deleteWarehouse(requireCompany(companyId), id);
    return Ok(undefined, 'Almacén eliminado');
  }

  @Get('warehouses/:id/movements')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Movimientos de stock del almacén' })
  async listMovements(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.execution.listMovements(requireCompany(companyId), id));
  }

  @Post('warehouses/:id/movements')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Registrar movimiento de stock' })
  async createMovement(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return Ok(
      await this.execution.createMovement(requireCompany(companyId), userId, id, dto),
      'Movimiento registrado',
    );
  }

  @Delete('stock-movements/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar movimiento de stock' })
  async deleteMovement(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deleteMovement(requireCompany(companyId), id);
    return Ok(undefined, 'Movimiento eliminado');
  }

  // ─── Compras ──────────────────────────────────────────────────────────────
  @Get('projects/:projectId/purchase-orders')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Órdenes de compra del proyecto' })
  async listPurchaseOrders(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.execution.listPurchaseOrders(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/purchase-orders')
  @RequirePermissions(Permissions.EXECUTION.CREATE)
  @Audit({ entityType: 'Execution', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear orden de compra con líneas' })
  async createPurchaseOrder(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return Ok(
      await this.execution.createPurchaseOrder(
        requireCompany(companyId),
        userId,
        projectId,
        dto,
        dto.lines,
      ),
      'Orden creada',
    );
  }

  @Get('purchase-orders/:id')
  @RequirePermissions(Permissions.EXECUTION.READ)
  @ApiOperation({ summary: 'Detalle de orden de compra' })
  async getPurchaseOrder(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.execution.getPurchaseOrder(requireCompany(companyId), id));
  }

  @Patch('purchase-orders/:id')
  @RequirePermissions(Permissions.EXECUTION.UPDATE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar orden de compra' })
  async updatePurchaseOrder(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return Ok(
      await this.execution.updatePurchaseOrder(requireCompany(companyId), id, dto),
      'Orden actualizada',
    );
  }

  @Delete('purchase-orders/:id')
  @RequirePermissions(Permissions.EXECUTION.DELETE)
  @Audit({ entityType: 'Execution', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar orden de compra' })
  async deletePurchaseOrder(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.execution.deletePurchaseOrder(requireCompany(companyId), id);
    return Ok(undefined, 'Orden eliminada');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
