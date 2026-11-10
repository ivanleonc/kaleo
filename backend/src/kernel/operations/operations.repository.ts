import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type { OperationKind, OperationRow } from './operations.types.js';

@Injectable()
export class OperationsRepository {
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

  async getInternal(id: string): Promise<OperationRow | null> {
    const rows = await this.privilegedDataSource.query(
      `SELECT * FROM operations WHERE id = $1`,
      [id],
    );
    return (rows[0] as OperationRow) ?? null;
  }

  async markProcessing(id: string): Promise<void> {
    await this.privilegedDataSource.query(
      `UPDATE operations SET status = 'processing', error = NULL WHERE id = $1`,
      [id],
    );
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
    await this.privilegedDataSource.query(
      `UPDATE operations
       SET status = 'ready',
           filename = $2,
           content_type = $3,
           data = $4,
           result = $5::jsonb,
           error = NULL,
           completed_at = now()
       WHERE id = $1`,
      [
        id,
        result.filename ?? null,
        result.contentType ?? null,
        result.data ?? null,
        result.summary ? JSON.stringify(result.summary) : null,
      ],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.privilegedDataSource.query(
      `UPDATE operations
       SET status = 'failed', error = $2, completed_at = now()
       WHERE id = $1`,
      [id, error.slice(0, 1000)],
    );
  }
}
