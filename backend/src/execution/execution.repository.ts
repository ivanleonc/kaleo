import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  ContractRow,
  PayrollEntryRow,
  PurchaseOrderDetail,
  PurchaseOrderLineRow,
  PurchaseOrderRow,
  ScheduleActivityRow,
  StockMovementRow,
  WarehouseRow,
} from './execution.types.js';

const CONTRACT_SELECT = `
  SELECT c.*, p.name AS party_name
  FROM contracts c
  LEFT JOIN parties p ON p.id = c.party_id AND p.company_id = c.company_id
`;

const WAREHOUSE_SELECT = `
  SELECT w.*, pr.name AS project_name
  FROM warehouses w
  LEFT JOIN projects pr ON pr.id = w.project_id AND pr.company_id = w.company_id
`;

const MOVEMENT_SELECT = `
  SELECT sm.*, r.code AS resource_code, r.name AS resource_name, u.code AS unit_code
  FROM stock_movements sm
  JOIN resources r ON r.id = sm.resource_id
  JOIN units_of_measure u ON u.id = r.unit_id
`;

const PO_SELECT = `
  SELECT po.*, p.name AS supplier_name,
         (SELECT COUNT(*)::int FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id) AS lines_count,
         COALESCE((SELECT SUM(pol.quantity * pol.unit_price)
                   FROM purchase_order_lines pol
                   WHERE pol.purchase_order_id = po.id), 0)::float8 AS total
  FROM purchase_orders po
  LEFT JOIN parties p ON p.id = po.supplier_party_id AND p.company_id = po.company_id
`;

@Injectable()
export class ExecutionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  // ─── Programación ─────────────────────────────────────────────────────────
  async listSchedule(companyId: string, projectId: string): Promise<ScheduleActivityRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM schedule_activities
         WHERE company_id = $1 AND project_id = $2 AND deleted_at IS NULL
         ORDER BY start_date NULLS LAST, created_at`,
        [companyId, projectId],
      )) as ScheduleActivityRow[];
      return rows.map((row) => ({ ...row, progress_pct: Number(row.progress_pct) }));
    });
  }

  async createScheduleActivity(
    companyId: string,
    userId: string,
    projectId: string,
    input: Record<string, unknown>,
  ): Promise<ScheduleActivityRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO schedule_activities
           (company_id, project_id, budget_item_id, name, start_date, end_date,
            progress_pct, predecessor_id, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.budgetItemId ?? null,
          input.name,
          input.startDate ?? null,
          input.endDate ?? null,
          input.progressPct ?? 0,
          input.predecessorId ?? null,
          input.status ?? 'pending',
          input.notes ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      return this.findScheduleActivityWithRunner(queryRunner, companyId, rows[0]!.id);
    });
  }

  async findScheduleActivity(
    companyId: string,
    id: string,
  ): Promise<ScheduleActivityRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      this.findScheduleActivityWithRunner(queryRunner, companyId, id),
    );
  }

  async updateScheduleActivity(
    companyId: string,
    id: string,
    fields: Record<string, unknown>,
    columns: string[],
  ): Promise<ScheduleActivityRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(fields, columns, {
        nullEmptyStrings: ['notes', 'budget_item_id', 'predecessor_id'],
        extraSet: ['updated_at = now()'],
      });
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE schedule_activities SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      return this.findScheduleActivityWithRunner(queryRunner, companyId, id);
    });
  }

  async deleteScheduleActivity(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE schedule_activities SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  private async findScheduleActivityWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    id: string,
  ): Promise<ScheduleActivityRow | null> {
    const rows = (await queryRunner.query(
      `SELECT * FROM schedule_activities
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    )) as ScheduleActivityRow[];
    return rows[0] ? { ...rows[0], progress_pct: Number(rows[0].progress_pct) } : null;
  }

  // ─── Contratos ────────────────────────────────────────────────────────────
  async listContracts(companyId: string, projectId: string): Promise<ContractRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${CONTRACT_SELECT}
         WHERE c.company_id = $1 AND c.project_id = $2 AND c.deleted_at IS NULL
         ORDER BY c.code`,
        [companyId, projectId],
      )) as ContractRow[];
      return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
    });
  }

  async createContract(
    companyId: string,
    userId: string,
    projectId: string,
    input: Record<string, unknown>,
  ): Promise<ContractRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO contracts
           (company_id, project_id, party_id, contract_type, code, name, amount,
            currency_code, start_date, end_date, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.partyId ?? null,
          input.contractType ?? 'obra',
          input.code,
          input.name,
          input.amount ?? 0,
          input.currencyCode,
          input.startDate ?? null,
          input.endDate ?? null,
          input.status ?? 'draft',
          input.notes ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      return this.findContractWithRunner(queryRunner, companyId, rows[0]!.id);
    });
  }

  async findContract(companyId: string, id: string): Promise<ContractRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      this.findContractWithRunner(queryRunner, companyId, id),
    );
  }

  async updateContract(
    companyId: string,
    id: string,
    fields: Record<string, unknown>,
    columns: string[],
  ): Promise<ContractRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(fields, columns, {
        nullEmptyStrings: ['notes', 'party_id'],
        extraSet: ['updated_at = now()'],
      });
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE contracts SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      return this.findContractWithRunner(queryRunner, companyId, id);
    });
  }

  async deleteContract(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE contracts SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  private async findContractWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    id: string,
  ): Promise<ContractRow | null> {
    const rows = (await queryRunner.query(
      `${CONTRACT_SELECT}
       WHERE c.id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL`,
      [id, companyId],
    )) as ContractRow[];
    return rows[0] ? { ...rows[0], amount: Number(rows[0].amount) } : null;
  }

  // ─── Nómina ───────────────────────────────────────────────────────────────
  async listPayroll(companyId: string, projectId: string): Promise<PayrollEntryRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM payroll_entries
         WHERE company_id = $1 AND project_id = $2 AND deleted_at IS NULL
         ORDER BY period_start DESC, worker_name`,
        [companyId, projectId],
      )) as PayrollEntryRow[];
      return rows.map((row) => ({
        ...row,
        days: Number(row.days),
        amount: Number(row.amount),
      }));
    });
  }

  async createPayrollEntry(
    companyId: string,
    userId: string,
    projectId: string,
    input: Record<string, unknown>,
  ): Promise<PayrollEntryRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO payroll_entries
           (company_id, project_id, membership_id, worker_name, period_start,
            period_end, days, amount, currency_code, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.membershipId ?? null,
          input.workerName,
          input.periodStart,
          input.periodEnd,
          input.days ?? 0,
          input.amount ?? 0,
          input.currencyCode,
          input.status ?? 'draft',
          input.notes ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      return this.findPayrollEntryWithRunner(queryRunner, companyId, rows[0]!.id);
    });
  }

  async findPayrollEntry(companyId: string, id: string): Promise<PayrollEntryRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      this.findPayrollEntryWithRunner(queryRunner, companyId, id),
    );
  }

  async updatePayrollEntry(
    companyId: string,
    id: string,
    fields: Record<string, unknown>,
    columns: string[],
  ): Promise<PayrollEntryRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(fields, columns, {
        nullEmptyStrings: ['notes', 'membership_id'],
        extraSet: ['updated_at = now()'],
      });
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE payroll_entries SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      return this.findPayrollEntryWithRunner(queryRunner, companyId, id);
    });
  }

  async deletePayrollEntry(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE payroll_entries SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  private async findPayrollEntryWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    id: string,
  ): Promise<PayrollEntryRow | null> {
    const rows = (await queryRunner.query(
      `SELECT * FROM payroll_entries
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    )) as PayrollEntryRow[];
    return rows[0]
      ? { ...rows[0], days: Number(rows[0].days), amount: Number(rows[0].amount) }
      : null;
  }

  // ─── Almacén ──────────────────────────────────────────────────────────────
  async listWarehouses(
    companyId: string,
    projectId?: string,
  ): Promise<WarehouseRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['w.company_id = $1', 'w.deleted_at IS NULL'];
      if (projectId) {
        values.push(projectId);
        where.push(`(w.project_id = $${values.length} OR w.project_id IS NULL)`);
      }
      const rows = (await queryRunner.query(
        `${WAREHOUSE_SELECT} WHERE ${where.join(' AND ')} ORDER BY w.name`,
        values,
      )) as WarehouseRow[];
      return rows;
    });
  }

  async findWarehouse(companyId: string, id: string): Promise<WarehouseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${WAREHOUSE_SELECT}
         WHERE w.id = $1 AND w.company_id = $2 AND w.deleted_at IS NULL`,
        [id, companyId],
      )) as WarehouseRow[];
      return rows[0] ?? null;
    });
  }

  async createWarehouse(
    companyId: string,
    input: Record<string, unknown>,
  ): Promise<WarehouseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO warehouses (company_id, project_id, code, name, location, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          companyId,
          input.projectId ?? null,
          input.code,
          input.name,
          input.location ?? null,
          input.isActive ?? true,
        ],
      )) as Array<{ id: string }>;
      return this.findWarehouse(companyId, rows[0]!.id);
    });
  }

  async updateWarehouse(
    companyId: string,
    id: string,
    fields: Record<string, unknown>,
    columns: string[],
  ): Promise<WarehouseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(fields, columns, {
        nullEmptyStrings: ['location', 'project_id'],
        extraSet: ['updated_at = now()'],
      });
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE warehouses SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      return this.findWarehouse(companyId, id);
    });
  }

  async deleteWarehouse(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE warehouses SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listMovements(
    companyId: string,
    warehouseId: string,
  ): Promise<StockMovementRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${MOVEMENT_SELECT}
         WHERE sm.company_id = $1 AND sm.warehouse_id = $2
         ORDER BY sm.occurred_at DESC, sm.created_at DESC
         LIMIT 500`,
        [companyId, warehouseId],
      )) as StockMovementRow[];
      return rows.map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        unit_cost: Number(row.unit_cost),
      }));
    });
  }

  async createMovement(
    companyId: string,
    userId: string,
    warehouseId: string,
    input: Record<string, unknown>,
  ): Promise<StockMovementRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO stock_movements
           (company_id, warehouse_id, resource_id, movement_type, quantity,
            unit_cost, occurred_at, reference, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10)
         RETURNING id`,
        [
          companyId,
          warehouseId,
          input.resourceId,
          input.movementType,
          input.quantity,
          input.unitCost ?? 0,
          input.occurredAt ?? null,
          input.reference ?? null,
          input.notes ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      const found = (await queryRunner.query(
        `${MOVEMENT_SELECT} WHERE sm.id = $1 AND sm.company_id = $2`,
        [rows[0]!.id, companyId],
      )) as StockMovementRow[];
      return found[0]
        ? {
            ...found[0],
            quantity: Number(found[0].quantity),
            unit_cost: Number(found[0].unit_cost),
          }
        : null;
    });
  }

  async deleteMovement(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM stock_movements
         WHERE id = $1 AND company_id = $2 RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  // ─── Compras ──────────────────────────────────────────────────────────────
  async listPurchaseOrders(companyId: string, projectId: string): Promise<PurchaseOrderRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${PO_SELECT}
         WHERE po.company_id = $1 AND po.project_id = $2 AND po.deleted_at IS NULL
         ORDER BY po.created_at DESC`,
        [companyId, projectId],
      )) as PurchaseOrderRow[];
      return rows.map((row) => ({ ...row, total: Number(row.total) }));
    });
  }

  async getPurchaseOrder(companyId: string, id: string): Promise<PurchaseOrderDetail | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const orders = (await queryRunner.query(
        `${PO_SELECT}
         WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL`,
        [id, companyId],
      )) as PurchaseOrderRow[];
      if (!orders[0]) return null;
      const lines = (await queryRunner.query(
        `SELECT pol.*, r.code AS resource_code,
                (pol.quantity * pol.unit_price)::float8 AS amount
         FROM purchase_order_lines pol
         LEFT JOIN resources r ON r.id = pol.resource_id
         WHERE pol.purchase_order_id = $1 AND pol.company_id = $2
         ORDER BY pol.created_at`,
        [id, companyId],
      )) as PurchaseOrderLineRow[];
      return {
        ...orders[0],
        total: Number(orders[0].total),
        lines: lines.map((line) => ({
          ...line,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          amount: Number(line.amount),
        })),
      };
    });
  }

  async createPurchaseOrder(
    companyId: string,
    userId: string,
    projectId: string,
    input: Record<string, unknown>,
    lines: Array<Record<string, unknown>>,
  ): Promise<PurchaseOrderDetail | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO purchase_orders
           (company_id, project_id, supplier_party_id, code, status, currency_code,
            notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.supplierPartyId ?? null,
          input.code,
          input.status ?? 'draft',
          input.currencyCode,
          input.notes ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      const orderId = rows[0]!.id;
      for (const line of lines) {
        await queryRunner.query(
          `INSERT INTO purchase_order_lines
             (company_id, purchase_order_id, resource_id, description, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            companyId,
            orderId,
            line.resourceId ?? null,
            line.description,
            line.quantity,
            line.unitPrice ?? 0,
          ],
        );
      }
      return this.getPurchaseOrder(companyId, orderId);
    });
  }

  async updatePurchaseOrder(
    companyId: string,
    id: string,
    fields: Record<string, unknown>,
    columns: string[],
  ): Promise<PurchaseOrderRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(fields, columns, {
        nullEmptyStrings: ['notes', 'supplier_party_id'],
        extraSet: ['updated_at = now()'],
      });
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE purchase_orders SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      const orders = (await queryRunner.query(
        `${PO_SELECT} WHERE po.id = $1 AND po.company_id = $2`,
        [id, companyId],
      )) as PurchaseOrderRow[];
      return orders[0] ? { ...orders[0], total: Number(orders[0].total) } : null;
    });
  }

  async deletePurchaseOrder(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE purchase_orders SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  // ─── Existencias ──────────────────────────────────────────────────────────
  async partyExists(companyId: string, partyId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM parties
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [partyId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async membershipExists(companyId: string, membershipId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM memberships
         WHERE id = $1 AND company_id = $2 AND status = 'active'`,
        [membershipId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async resourceExists(companyId: string, resourceId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM resources
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [resourceId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async currencyExists(code: string): Promise<boolean> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT code FROM currencies WHERE code = $1 AND is_active`,
        [code],
      )) as Array<{ code: string }>;
      return Boolean(rows[0]);
    });
  }
}
