import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type { OperationKind, OperationRow } from './operations.types.js';

@Injectable()
export class OperationsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async create(
    companyId: string,
    userId: string,
    kind: OperationKind,
    resource: string,
    format: string | null,
  ): Promise<OperationRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO operations (company_id, user_id, kind, resource, format)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [companyId, userId, kind, resource, format],
      );
      return rows[0] as OperationRow;
    });
  }

  async get(companyId: string, userId: string, id: string): Promise<OperationRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT * FROM operations
         WHERE id = $1 AND company_id = $2 AND user_id = $3`,
        [id, companyId, userId],
      );
      return (rows[0] as OperationRow) ?? null;
    });
  }

  async list(companyId: string, userId: string, limit = 50): Promise<OperationRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT id, company_id, user_id, kind, resource, format, status,
                filename, content_type, NULL::bytea AS data, result, error,
                created_at, completed_at
         FROM operations
         WHERE company_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [companyId, userId, Math.min(Math.max(limit, 1), 100)],
      );
      return rows as OperationRow[];
    });
  }

  async getInternal(id: string): Promise<OperationRow | null> {
    const companyId = this.tenantContext.requireCompanyId();
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT * FROM operations WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      return (rows[0] as OperationRow) ?? null;
    });
  }

  async markProcessing(id: string): Promise<void> {
    const companyId = this.tenantContext.requireCompanyId();
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE operations SET status = 'processing', error = NULL
         WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
    });
  }

  async markReady(
    id: string,
    result: {
      filename?: string | null;
      contentType?: string | null;
      data?: Buffer | null;
      summary?: Record<string, unknown>;
    },
  ): Promise<void> {
    const companyId = this.tenantContext.requireCompanyId();
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE operations
         SET status = 'ready',
             filename = $3,
             content_type = $4,
             data = $5,
             result = $6::jsonb,
             error = NULL,
             completed_at = now()
         WHERE id = $1 AND company_id = $2`,
        [
          id,
          companyId,
          result.filename ?? null,
          result.contentType ?? null,
          result.data ?? null,
          result.summary ? JSON.stringify(result.summary) : null,
        ],
      );
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const companyId = this.tenantContext.requireCompanyId();
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE operations
         SET status = 'failed', error = $3, completed_at = now()
         WHERE id = $1 AND company_id = $2`,
        [id, companyId, error.slice(0, 1000)],
      );
    });
  }
}
