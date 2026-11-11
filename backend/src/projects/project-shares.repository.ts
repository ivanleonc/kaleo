import { Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { rows } from '../common/utils/db.js';

export const SHARE_SCOPES = ['summary', 'budget'] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export interface ShareLinkRow {
  id: string;
  company_id: string;
  project_id: string;
  label: string | null;
  scope: ShareScope;
  expires_at: string | null;
  revoked_at: string | null;
  views_count: number;
  created_by: string | null;
  creator_name: string | null;
  created_at: string;
}

export interface SharedBudgetItem {
  code: string;
  name: string;
  item_type: string;
  unit_code: string | null;
  quantity: number;
  unit_price: number;
  partial_amount: number;
}

export interface SharedProjectPayload {
  company_name: string;
  project: {
    code: string;
    name: string;
    description: string | null;
    status: string;
    category: string | null;
    client_name: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  budget: {
    name: string;
    version: number;
    label: string | null;
    status: string;
    currency_code: string;
    subtotal: number;
    indirect_pct: number;
    indirect_fixed: number;
    indirect_total: number;
    total: number;
    approved_at: string | null;
    items?: Array<{
      code: string;
      name: string;
      item_type: string;
      unit_code: string | null;
      quantity: number;
      unit_price: number;
      partial_amount: number;
    }>;
  } | null;
}

interface ShareTokenLookup {
  id: string;
  company_id: string;
  project_id: string;
  scope: ShareScope;
  expires_at: string | null;
  revoked_at: string | null;
}

@Injectable()
export class ProjectSharesRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  private get privilegedDataSource(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async list(companyId: string, projectId: string): Promise<ShareLinkRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const result = await queryRunner.query(
        `SELECT s.id, s.company_id, s.project_id, s.label, s.scope, s.expires_at,
                s.revoked_at, s.views_count, s.created_by, s.created_at,
                u.name AS creator_name
         FROM project_share_links s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.company_id = $1 AND s.project_id = $2
         ORDER BY s.created_at DESC`,
        [companyId, projectId],
      );
      return rows<ShareLinkRow>(result);
    });
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    input: { label?: string | null; scope: ShareScope; expiresAt: Date | null },
    tokenHash: string,
  ): Promise<ShareLinkRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const inserted = (await queryRunner.query(
        `INSERT INTO project_share_links
           (company_id, project_id, token_hash, label, scope, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          companyId,
          projectId,
          tokenHash,
          input.label ?? null,
          input.scope,
          input.expiresAt,
          userId,
        ],
      )) as Array<{ id: string }>;
      const found = await queryRunner.query(
        `SELECT s.id, s.company_id, s.project_id, s.label, s.scope, s.expires_at,
                s.revoked_at, s.views_count, s.created_by, s.created_at,
                u.name AS creator_name
         FROM project_share_links s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.id = $1 AND s.company_id = $2`,
        [inserted[0]!.id, companyId],
      );
      return rows<ShareLinkRow>(found)[0] ?? null;
    });
  }

  async revoke(companyId: string, projectId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const updated = (await queryRunner.query(
        `UPDATE project_share_links
         SET revoked_at = now(), updated_at = now()
         WHERE id = $1 AND project_id = $2 AND company_id = $3 AND revoked_at IS NULL
         RETURNING id`,
        [id, projectId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(updated[0]);
    });
  }

  /**
   * Resolución pública por token: sin contexto de tenant. Usa la conexión
   * privilegiada (como invitaciones) y filtra company_id explícitamente en
   * todas las consultas.
   */
  async resolveSharedProject(tokenHash: string): Promise<SharedProjectPayload | null> {
    const link = rows<ShareTokenLookup>(
      await this.privilegedDataSource.query(
        `SELECT id, company_id, project_id, scope, expires_at, revoked_at
         FROM project_share_links
         WHERE token_hash = $1`,
        [tokenHash],
      ),
    )[0];
    if (!link) return null;
    if (link.revoked_at) return null;
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return null;

    const project = rows<{
      company_name: string;
      code: string;
      name: string;
      description: string | null;
      status: string;
      category: string | null;
      client_name: string | null;
      start_date: string | null;
      end_date: string | null;
    }>(
      await this.privilegedDataSource.query(
        `SELECT c.name AS company_name, p.code, p.name, p.description, p.status,
                p.category, party.name AS client_name, p.start_date, p.end_date
         FROM projects p
         JOIN companies c ON c.id = p.company_id
         LEFT JOIN parties party ON party.id = p.client_party_id
         WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL`,
        [link.project_id, link.company_id],
      ),
    )[0];
    if (!project) return null;

    await this.privilegedDataSource.query(
      `UPDATE project_share_links SET views_count = views_count + 1 WHERE id = $1`,
      [link.id],
    );

    const budget = rows<NonNullable<SharedProjectPayload['budget']>>(
      await this.privilegedDataSource.query(
        `SELECT b.name, b.version, b.label, b.status, b.currency_code,
                b.subtotal::float8 AS subtotal,
                b.indirect_pct::float8 AS indirect_pct,
                b.indirect_fixed::float8 AS indirect_fixed,
                b.indirect_total::float8 AS indirect_total,
                b.total::float8 AS total,
                b.approved_at
         FROM budgets b
         WHERE b.project_id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL
         ORDER BY b.version DESC
         LIMIT 1`,
        [link.project_id, link.company_id],
      ),
    )[0];

    const payload: SharedProjectPayload = {
      company_name: project.company_name,
      project: {
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        category: project.category,
        client_name: project.client_name,
        start_date: project.start_date,
        end_date: project.end_date,
      },
      budget: budget
        ? {
            ...budget,
            subtotal: Number(budget.subtotal),
            indirect_pct: Number(budget.indirect_pct),
            indirect_fixed: Number(budget.indirect_fixed),
            indirect_total: Number(budget.indirect_total),
            total: Number(budget.total),
          }
        : null,
    };

    if (budget && link.scope === 'budget') {
      const budgetIdRows = rows<{ id: string }>(
        await this.privilegedDataSource.query(
          `SELECT id FROM budgets
           WHERE project_id = $1 AND company_id = $2 AND deleted_at IS NULL
           ORDER BY version DESC LIMIT 1`,
          [link.project_id, link.company_id],
        ),
      );
      const items = rows<SharedBudgetItem>(
        await this.privilegedDataSource.query(
          `SELECT bi.code, bi.name, bi.item_type, u.code AS unit_code,
                  bi.quantity::float8 AS quantity,
                  bi.unit_price::float8 AS unit_price,
                  bi.partial_amount::float8 AS partial_amount
           FROM budget_items bi
           LEFT JOIN units_of_measure u ON u.id = bi.unit_id
           WHERE bi.budget_id = $1 AND bi.company_id = $2
           ORDER BY bi.sort_order, bi.code`,
          [budgetIdRows[0]?.id ?? null, link.company_id],
        ),
      );
      payload.budget!.items = items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        partial_amount: Number(item.partial_amount),
      }));
    }

    return payload;
  }
}
