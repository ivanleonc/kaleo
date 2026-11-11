import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionRepository } from './execution.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import type {
  ContractRow,
  PayrollEntryRow,
  PurchaseOrderDetail,
  PurchaseOrderRow,
  ScheduleActivityRow,
  StockMovementRow,
  WarehouseRow,
} from './execution.types.js';

export const EXECUTION_MODULE_CODE = 'construction.execution';

type RawRecord = Record<string, any>;

@Injectable()
export class ExecutionService {
  constructor(
    private readonly repository: ExecutionRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  // ─── Programación ─────────────────────────────────────────────────────────
  listSchedule(companyId: string, projectId: string): Promise<ScheduleActivityRow[]> {
    return this.repository.listSchedule(companyId, projectId);
  }

  async createScheduleActivity(
    companyId: string,
    userId: string,
    projectId: string,
    input: RawRecord,
  ): Promise<ScheduleActivityRow> {
    await this.assertWritable(companyId);
    validateName(input.name);
    validateDateRange(input.startDate as string | null, input.endDate as string | null);
    const created = await this.repository.createScheduleActivity(
      companyId,
      userId,
      projectId,
      input,
    );
    if (!created) throw new BadRequestException('No pudimos crear la actividad');
    return created;
  }

  async updateScheduleActivity(
    companyId: string,
    id: string,
    input: RawRecord,
  ): Promise<ScheduleActivityRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findScheduleActivity(companyId, id);
    if (!current) throw new NotFoundException('Actividad no encontrada');
    validateDateRange(
      (input.startDate as string | null) ?? current.start_date,
      (input.endDate as string | null) ?? current.end_date,
    );
    const updated = await this.repository.updateScheduleActivity(
      companyId,
      id,
      {
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        progress_pct: input.progressPct,
        predecessor_id: input.predecessorId,
        budget_item_id: input.budgetItemId,
        status: input.status,
        notes: input.notes,
      },
      [
        'name',
        'start_date',
        'end_date',
        'progress_pct',
        'predecessor_id',
        'budget_item_id',
        'status',
        'notes',
      ],
    );
    if (!updated) throw new NotFoundException('Actividad no encontrada');
    return updated;
  }

  async deleteScheduleActivity(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteScheduleActivity(companyId, id);
    if (!deleted) throw new NotFoundException('Actividad no encontrada');
  }

  // ─── Contratos ────────────────────────────────────────────────────────────
  listContracts(companyId: string, projectId: string): Promise<ContractRow[]> {
    return this.repository.listContracts(companyId, projectId);
  }

  async createContract(
    companyId: string,
    userId: string,
    projectId: string,
    input: RawRecord,
  ): Promise<ContractRow> {
    await this.assertWritable(companyId);
    validateName(input.name);
    validateCode(input.code);
    validateDateRange(input.startDate as string | null, input.endDate as string | null);
    if (input.partyId && !(await this.repository.partyExists(companyId, String(input.partyId)))) {
      throw new BadRequestException('El tercero no existe');
    }
    await this.assertCurrency(String(input.currencyCode));
    const normalized = {
      ...input,
      currencyCode: String(input.currencyCode).toUpperCase(),
    };
    try {
      const created = await this.repository.createContract(companyId, userId, projectId, normalized);
      if (!created) throw new BadRequestException('No pudimos crear el contrato');
      return created;
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un contrato con ese código en el proyecto');
    }
  }

  async updateContract(
    companyId: string,
    id: string,
    input: RawRecord,
  ): Promise<ContractRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findContract(companyId, id);
    if (!current) throw new NotFoundException('Contrato no encontrado');
    if (input.partyId && !(await this.repository.partyExists(companyId, String(input.partyId)))) {
      throw new BadRequestException('El tercero no existe');
    }
    validateDateRange(
      (input.startDate as string | null) ?? current.start_date,
      (input.endDate as string | null) ?? current.end_date,
    );
    const updated = await this.repository.updateContract(
      companyId,
      id,
      {
        party_id: input.partyId,
        contract_type: input.contractType,
        code: input.code,
        name: input.name,
        amount: input.amount,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status,
        notes: input.notes,
      },
      [
        'party_id',
        'contract_type',
        'code',
        'name',
        'amount',
        'start_date',
        'end_date',
        'status',
        'notes',
      ],
    );
    if (!updated) throw new NotFoundException('Contrato no encontrado');
    return updated;
  }

  async deleteContract(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteContract(companyId, id);
    if (!deleted) throw new NotFoundException('Contrato no encontrado');
  }

  // ─── Nómina ───────────────────────────────────────────────────────────────
  listPayroll(companyId: string, projectId: string): Promise<PayrollEntryRow[]> {
    return this.repository.listPayroll(companyId, projectId);
  }

  async createPayrollEntry(
    companyId: string,
    userId: string,
    projectId: string,
    input: RawRecord,
  ): Promise<PayrollEntryRow> {
    await this.assertWritable(companyId);
    validateName(input.workerName);
    validateDateRange(input.periodStart as string, input.periodEnd as string);
    if (
      input.membershipId &&
      !(await this.repository.membershipExists(companyId, String(input.membershipId)))
    ) {
      throw new BadRequestException('El miembro no es un miembro activo');
    }
    await this.assertCurrency(String(input.currencyCode));
    const created = await this.repository.createPayrollEntry(companyId, userId, projectId, {
      ...input,
      currencyCode: String(input.currencyCode).toUpperCase(),
    });
    if (!created) throw new BadRequestException('No pudimos crear el registro de nómina');
    return created;
  }

  async updatePayrollEntry(
    companyId: string,
    id: string,
    input: RawRecord,
  ): Promise<PayrollEntryRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findPayrollEntry(companyId, id);
    if (!current) throw new NotFoundException('Registro de nómina no encontrado');
    if (
      input.membershipId &&
      !(await this.repository.membershipExists(companyId, String(input.membershipId)))
    ) {
      throw new BadRequestException('El miembro no es un miembro activo');
    }
    validateDateRange(
      (input.periodStart as string) ?? current.period_start,
      (input.periodEnd as string) ?? current.period_end,
    );
    const updated = await this.repository.updatePayrollEntry(
      companyId,
      id,
      {
        membership_id: input.membershipId,
        worker_name: input.workerName,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        days: input.days,
        amount: input.amount,
        status: input.status,
        notes: input.notes,
      },
      [
        'membership_id',
        'worker_name',
        'period_start',
        'period_end',
        'days',
        'amount',
        'status',
        'notes',
      ],
    );
    if (!updated) throw new NotFoundException('Registro de nómina no encontrado');
    return updated;
  }

  async deletePayrollEntry(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deletePayrollEntry(companyId, id);
    if (!deleted) throw new NotFoundException('Registro de nómina no encontrado');
  }

  // ─── Almacén ──────────────────────────────────────────────────────────────
  listWarehouses(companyId: string, projectId?: string): Promise<WarehouseRow[]> {
    return this.repository.listWarehouses(companyId, projectId);
  }

  async createWarehouse(companyId: string, input: RawRecord): Promise<WarehouseRow> {
    await this.assertWritable(companyId);
    validateName(input.name);
    validateCode(input.code);
    try {
      const created = await this.repository.createWarehouse(companyId, input);
      if (!created) throw new BadRequestException('No pudimos crear el almacén');
      return created;
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un almacén con ese código');
    }
  }

  async updateWarehouse(
    companyId: string,
    id: string,
    input: RawRecord,
  ): Promise<WarehouseRow> {
    await this.assertWritable(companyId);
    const updated = await this.repository.updateWarehouse(
      companyId,
      id,
      {
        project_id: input.projectId,
        code: input.code,
        name: input.name,
        location: input.location,
        is_active: input.isActive,
      },
      ['project_id', 'code', 'name', 'location', 'is_active'],
    );
    if (!updated) throw new NotFoundException('Almacén no encontrado');
    return updated;
  }

  async deleteWarehouse(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteWarehouse(companyId, id);
    if (!deleted) throw new NotFoundException('Almacén no encontrado');
  }

  listMovements(companyId: string, warehouseId: string): Promise<StockMovementRow[]> {
    return this.repository.listMovements(companyId, warehouseId);
  }

  async createMovement(
    companyId: string,
    userId: string,
    warehouseId: string,
    input: RawRecord,
  ): Promise<StockMovementRow> {
    await this.assertWritable(companyId);
    const warehouse = await this.repository.findWarehouse(companyId, warehouseId);
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    if (!(await this.repository.resourceExists(companyId, String(input.resourceId)))) {
      throw new BadRequestException('El recurso no existe');
    }
    if (Number(input.quantity ?? 0) <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }
    const created = await this.repository.createMovement(companyId, userId, warehouseId, input);
    if (!created) throw new BadRequestException('No pudimos registrar el movimiento');
    return created;
  }

  async deleteMovement(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteMovement(companyId, id);
    if (!deleted) throw new NotFoundException('Movimiento no encontrado');
  }

  // ─── Compras ──────────────────────────────────────────────────────────────
  listPurchaseOrders(companyId: string, projectId: string): Promise<PurchaseOrderRow[]> {
    return this.repository.listPurchaseOrders(companyId, projectId);
  }

  async getPurchaseOrder(companyId: string, id: string): Promise<PurchaseOrderDetail> {
    const order = await this.repository.getPurchaseOrder(companyId, id);
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  async createPurchaseOrder(
    companyId: string,
    userId: string,
    projectId: string,
    input: RawRecord,
    lines: RawRecord[],
  ): Promise<PurchaseOrderDetail> {
    await this.assertWritable(companyId);
    validateCode(input.code);
    if (lines.length === 0) {
      throw new BadRequestException('La orden requiere al menos una línea');
    }
    if (
      input.supplierPartyId &&
      !(await this.repository.partyExists(companyId, String(input.supplierPartyId)))
    ) {
      throw new BadRequestException('El proveedor no existe');
    }
    for (const line of lines) {
      if (!String(line.description ?? '').trim()) {
        throw new BadRequestException('Cada línea requiere una descripción');
      }
      if (Number(line.quantity ?? 0) <= 0) {
        throw new BadRequestException('La cantidad de cada línea debe ser mayor a cero');
      }
      if (line.resourceId && !(await this.repository.resourceExists(companyId, String(line.resourceId)))) {
        throw new BadRequestException('Un recurso de la orden no existe');
      }
    }
    await this.assertCurrency(String(input.currencyCode));
    try {
      const created = await this.repository.createPurchaseOrder(
        companyId,
        userId,
        projectId,
        { ...input, currencyCode: String(input.currencyCode).toUpperCase() },
        lines,
      );
      if (!created) throw new BadRequestException('No pudimos crear la orden');
      return created;
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe una orden con ese código en el proyecto');
    }
  }

  async updatePurchaseOrder(
    companyId: string,
    id: string,
    input: RawRecord,
  ): Promise<PurchaseOrderDetail> {
    await this.assertWritable(companyId);
    const current = await this.getPurchaseOrder(companyId, id);
    if (current.status === 'received' || current.status === 'cancelled') {
      throw new BadRequestException('La orden está cerrada');
    }
    if (
      input.supplierPartyId &&
      !(await this.repository.partyExists(companyId, String(input.supplierPartyId)))
    ) {
      throw new BadRequestException('El proveedor no existe');
    }
    await this.repository.updatePurchaseOrder(
      companyId,
      id,
      {
        supplier_party_id: input.supplierPartyId,
        code: input.code,
        status: input.status,
        notes: input.notes,
      },
      ['supplier_party_id', 'code', 'status', 'notes'],
    );
    return this.getPurchaseOrder(companyId, id);
  }

  async deletePurchaseOrder(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deletePurchaseOrder(companyId, id);
    if (!deleted) throw new NotFoundException('Orden de compra no encontrada');
  }

  private async assertCurrency(code: string): Promise<void> {
    if (!code || !(await this.repository.currencyExists(code.toUpperCase()))) {
      throw new BadRequestException('La moneda no existe');
    }
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, EXECUTION_MODULE_CODE);
  }
}

function validateName(value: unknown): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('El nombre es obligatorio');
  }
}

function validateCode(value: unknown): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('El código es obligatorio');
  }
}

function validateDateRange(start: string | null | undefined, end: string | null | undefined): void {
  if (start && end && end < start) {
    throw new BadRequestException('La fecha final no puede ser anterior a la inicial');
  }
}

function mapUniqueViolation(error: unknown, message: string): Error {
  if ((error as { code?: string })?.code === '23505') return new ConflictException(message);
  return error as Error;
}
