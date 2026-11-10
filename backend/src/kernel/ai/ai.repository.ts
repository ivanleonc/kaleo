import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type {
  AiActionRow,
  AiActionStatus,
  AiRunRow,
  AiRunStatus,
  AiToolRow,
} from './ai.types.js';

@Injectable()
export class AiRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async listTools(): Promise<AiToolRow[]> {
    return this.dataSource.query(
      `SELECT code, module_code, name, description, risk,
              requires_confirmation, permission, input_schema, is_active
       FROM ai_tools
       WHERE is_active = TRUE
       ORDER BY code`,
    );
  }

  async findTool(code: string): Promise<AiToolRow | null> {
    const rows = await this.dataSource.query(
      `SELECT code, module_code, name, description, risk,
              requires_confirmation, permission, input_schema, is_active
       FROM ai_tools
       WHERE code = $1 AND is_active = TRUE`,
      [code],
    );
    return (rows[0] as AiToolRow) ?? null;
  }

  async createRun(
    companyId: string,
    userId: string,
    toolCode: string,
    input: Record<string, unknown>,
    status: AiRunStatus,
  ): Promise<AiRunRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO ai_runs (company_id, user_id, tool_code, status, input)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [companyId, userId, toolCode, status, JSON.stringify(input)],
      );
      return rows[0] as AiRunRow;
    });
  }

  async getRun(companyId: string, id: string): Promise<AiRunRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT * FROM ai_runs WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      return (rows[0] as AiRunRow) ?? null;
    });
  }

  async updateRun(
    id: string,
    status: AiRunStatus,
    output?: Record<string, unknown> | null,
    error?: string | null,
  ): Promise<void> {
    const companyId = this.tenantContext.requireCompanyId();
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE ai_runs
         SET status = $3,
             output = $4::jsonb,
             error = $5,
             completed_at = CASE WHEN $3 IN ('completed','rejected','failed') THEN now() ELSE NULL END
         WHERE id = $1 AND company_id = $2`,
        [id, companyId, status, output ? JSON.stringify(output) : null, error ?? null],
      );
    });
  }

  async createAction(
    companyId: string,
    runId: string,
    toolCode: string,
    userId: string,
    input: Record<string, unknown>,
  ): Promise<AiActionRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO ai_action_requests
           (company_id, run_id, tool_code, requested_by, input)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [companyId, runId, toolCode, userId, JSON.stringify(input)],
      );
      return rows[0] as AiActionRow;
    });
  }

  async getAction(companyId: string, id: string): Promise<AiActionRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT * FROM ai_action_requests WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      return (rows[0] as AiActionRow) ?? null;
    });
  }

  async listActions(companyId: string, status?: AiActionStatus): Promise<AiActionRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT * FROM ai_action_requests
         WHERE company_id = $1 AND ($2::text IS NULL OR status = $2)
         ORDER BY created_at DESC
         LIMIT 100`,
        [companyId, status ?? null],
      );
      return rows as AiActionRow[];
    });
  }

  /**
   * Reclamo atómico: solo una aprobación puede ejecutar la acción.
   */
  async claimAction(
    companyId: string,
    id: string,
    approverId: string,
  ): Promise<AiActionRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `UPDATE ai_action_requests
         SET status = 'approved', approved_by = $2, approved_at = now()
         WHERE id = $1 AND company_id = $3 AND status = 'pending'
         RETURNING *`,
        [id, approverId, companyId],
      );
      return (rows[0] as AiActionRow) ?? null;
    });
  }

  async finishAction(
    id: string,
    status: AiActionStatus,
    output?: Record<string, unknown> | null,
    error?: string | null,
  ): Promise<void> {
    const companyId = this.tenantContext.requireCompanyId();
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE ai_action_requests
         SET status = $3,
             output = $4::jsonb,
             error = $5,
             executed_at = CASE WHEN $3 IN ('executed','failed') THEN now() ELSE executed_at END
         WHERE id = $1 AND company_id = $2`,
        [id, companyId, status, output ? JSON.stringify(output) : null, error ?? null],
      );
    });
  }
}
