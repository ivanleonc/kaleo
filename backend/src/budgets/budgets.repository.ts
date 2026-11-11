import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  BudgetDetail,
  BudgetItemRow,
  BudgetRow,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
} from './budgets.types.js';

const BUDGET_SELECT = `
  SELECT b.*, ab.name AS apu_base_name,
         (SELECT COUNT(*)::int FROM budget_items bi WHERE bi.budget_id = b.id)
           AS items_count
  FROM budgets b
  LEFT JOIN apu_bases ab ON ab.id = b.apu_base_id AND ab.company_id = b.company_id
`;

@Injectable()
export class BudgetsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async findByProject(companyId: string, projectId: string): Promise<BudgetRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${BUDGET_SELECT}
         WHERE b.company_id = $1 AND b.project_id = $2 AND b.deleted_at IS NULL
         ORDER BY b.created_at DESC LIMIT 1`,
        [companyId, projectId],
      )) as BudgetRow[];
      return rows[0] ? mapBudget(rows[0]) : null;
    });
  }

  async findById(companyId: string, id: string): Promise<BudgetRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${BUDGET_SELECT}
         WHERE b.id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL`,
        [id, companyId],
      )) as BudgetRow[];
      return rows[0] ? mapBudget(rows[0]) : null;
    });
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    input: { code: string; name: string; currencyCode: string; apuBaseId?: string | null },
  ): Promise<BudgetDetail> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO budgets
           (company_id, project_id, code, name, currency_code, apu_base_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.code,
          input.name,
          input.currencyCode,
          input.apuBaseId ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      return rows[0]!.id;
    });
    return (await this.getDetail(companyId, id))!;
  }

  async update(
    companyId: string,
    id: string,
    input: {
      name?: string;
      status?: string;
      apuBaseId?: string | null;
      indirectPct?: number;
      indirectFixed?: number;
      approvedBy?: string | null;
      approvedAt?: string | null;
    },
  ): Promise<BudgetRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          name: input.name,
          status: input.status,
          apu_base_id: input.apuBaseId,
          indirect_pct: input.indirectPct,
          indirect_fixed: input.indirectFixed,
          approved_by: input.approvedBy,
          approved_at: input.approvedAt,
        },
        [
          'name',
          'status',
          'apu_base_id',
          'indirect_pct',
          'indirect_fixed',
          'approved_by',
          'approved_at',
        ],
        { extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE budgets SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      const result = (await queryRunner.query(
        `${BUDGET_SELECT} WHERE b.id = $1 AND b.company_id = $2`,
        [id, companyId],
      )) as BudgetRow[];
      return result[0] ? mapBudget(result[0]) : null;
    });
  }

  async getDetail(companyId: string, id: string): Promise<BudgetDetail | null> {
    const budget = await this.findById(companyId, id);
    if (!budget) return null;
    const project = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const rows = (await queryRunner.query(
          `SELECT code, name FROM projects WHERE id = $1 AND company_id = $2`,
          [budget.project_id, companyId],
        )) as Array<{ code: string; name: string }>;
        return rows[0] ?? null;
      },
    );
    const items = await this.listItems(companyId, id);
    return {
      ...budget,
      project_code: project?.code ?? '',
      project_name: project?.name ?? '',
      items,
    };
  }

  async listItems(companyId: string, budgetId: string): Promise<BudgetItemRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT bi.*, u.code AS unit_code, u.name AS unit_name,
                us.name AS assigned_user_name
         FROM budget_items bi
         LEFT JOIN units_of_measure u ON u.id = bi.unit_id
         LEFT JOIN memberships m ON m.id = bi.assigned_membership_id AND m.company_id = bi.company_id
         LEFT JOIN users us ON us.id = m.user_id
         WHERE bi.company_id = $1 AND bi.budget_id = $2
         ORDER BY bi.sort_order, bi.code`,
        [companyId, budgetId],
      )) as BudgetItemRow[];
      return rows.map(mapItem);
    });
  }

  async createItem(
    companyId: string,
    budgetId: string,
    input: CreateBudgetItemInput & {
      code: string;
      unitPrice?: number;
      apuId?: string | null;
      apuVersionId?: string | null;
      sortOrder?: number;
    },
  ): Promise<BudgetItemRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO budget_items
           (company_id, budget_id, parent_id, code, name, item_type, unit_id,
            quantity, unit_price, apu_id, apu_version_id, assigned_membership_id,
            sort_order, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          companyId,
          budgetId,
          input.parentId ?? null,
          input.code,
          input.name,
          input.itemType,
          input.unitId ?? null,
          input.quantity ?? 0,
          input.unitPrice ?? 0,
          input.apuId ?? null,
          input.apuVersionId ?? null,
          input.assignedMembershipId ?? null,
          input.sortOrder ?? 0,
          input.notes ?? null,
        ],
      )) as Array<{ id: string }>;
      const items = await this.listItemsWithRunner(queryRunner, companyId, budgetId);
      return items.find((item) => item.id === rows[0]!.id)!;
    });
  }

  async updateItem(
    companyId: string,
    budgetId: string,
    itemId: string,
    input: UpdateBudgetItemInput,
  ): Promise<BudgetItemRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          name: input.name,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          assigned_membership_id: input.assignedMembershipId,
          notes: input.notes,
          sort_order: input.sortOrder,
        },
        ['name', 'quantity', 'unit_price', 'assigned_membership_id', 'notes', 'sort_order'],
        { nullEmptyStrings: ['notes', 'assigned_membership_id'], extraSet: ['updated_at = now()'] },
      );
      values.push(itemId, budgetId, companyId);
      await queryRunner.query(
        `UPDATE budget_items SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND budget_id = $${startIndex + 1}
           AND company_id = $${startIndex + 2}`,
        values,
      );
      const items = await this.listItemsWithRunner(queryRunner, companyId, budgetId);
      return items.find((item) => item.id === itemId) ?? null;
    });
  }

  async deleteItem(companyId: string, budgetId: string, itemId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM budget_items
         WHERE id = $1 AND budget_id = $2 AND company_id = $3 RETURNING id`,
        [itemId, budgetId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async updateCalculations(
    companyId: string,
    budgetId: string,
    itemPartials: Array<{ id: string; partial: number }>,
    totals: { subtotal: number; indirectTotal: number; total: number },
  ): Promise<void> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      for (const item of itemPartials) {
        await queryRunner.query(
          `UPDATE budget_items SET partial_amount = $3
           WHERE id = $1 AND budget_id = $2 AND company_id = $4`,
          [item.id, budgetId, item.partial, companyId],
        );
      }
      await queryRunner.query(
        `UPDATE budgets
         SET subtotal = $3, indirect_total = $4, total = $5, updated_at = now()
         WHERE id = $1 AND company_id = $2`,
        [budgetId, companyId, totals.subtotal, totals.indirectTotal, totals.total],
      );
    });
  }

  async insertApproval(
    companyId: string,
    budgetId: string,
    userId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `INSERT INTO budget_approvals (company_id, budget_id, approved_by, snapshot)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [companyId, budgetId, userId, JSON.stringify(snapshot)],
      );
    });
  }

  async unitExists(companyId: string, unitId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM units_of_measure
         WHERE id = $1 AND (company_id IS NULL OR company_id = $2)
           AND deleted_at IS NULL`,
        [unitId, companyId],
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

  private async listItemsWithRunner(
    queryRunner: { query(sql: string, parameters?: any[]): Promise<any> },
    companyId: string,
    budgetId: string,
  ): Promise<BudgetItemRow[]> {
    const rows = (await queryRunner.query(
      `SELECT bi.*, u.code AS unit_code, u.name AS unit_name,
              us.name AS assigned_user_name
       FROM budget_items bi
       LEFT JOIN units_of_measure u ON u.id = bi.unit_id
       LEFT JOIN memberships m ON m.id = bi.assigned_membership_id AND m.company_id = bi.company_id
       LEFT JOIN users us ON us.id = m.user_id
       WHERE bi.company_id = $1 AND bi.budget_id = $2
       ORDER BY bi.sort_order, bi.code`,
      [companyId, budgetId],
    )) as BudgetItemRow[];
    return rows.map(mapItem);
  }
}

function mapBudget(row: BudgetRow): BudgetRow {
  return {
    ...row,
    indirect_pct: Number(row.indirect_pct),
    indirect_fixed: Number(row.indirect_fixed),
    subtotal: Number(row.subtotal),
    indirect_total: Number(row.indirect_total),
    total: Number(row.total),
  };
}

function mapItem(row: BudgetItemRow): BudgetItemRow {
  return {
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    partial_amount: Number(row.partial_amount),
  };
}
