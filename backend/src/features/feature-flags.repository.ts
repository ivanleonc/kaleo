import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { rows, row } from '../common/utils/db.js';
import type { FeatureFlagRow } from '../common/types/db-rows.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';

@Injectable()
export class FeatureFlagsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async isEnabled(companyId: string, flag: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const result = row<{ enabled: boolean }>(await queryRunner.query(
        `SELECT enabled FROM feature_flags
         WHERE company_id = $1 AND flag = $2`,
        [companyId, flag],
      ));
      return result?.enabled === true;
    });
  }

  async listByCompany(companyId: string): Promise<FeatureFlagRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      rows<FeatureFlagRow>(await queryRunner.query(
        `SELECT flag, enabled, description, updated_at
         FROM feature_flags
         WHERE company_id = $1
         ORDER BY flag`,
        [companyId],
      )),
    );
  }

  async upsert(
    companyId: string,
    flag: string,
    enabled: boolean,
    description?: string | null,
  ): Promise<FeatureFlagRow | undefined> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      row<FeatureFlagRow>(await queryRunner.query(
        `INSERT INTO feature_flags (company_id, flag, enabled, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, flag)
         DO UPDATE SET enabled = EXCLUDED.enabled,
                       description = COALESCE(EXCLUDED.description, feature_flags.description)
         RETURNING flag, enabled, description, updated_at`,
        [companyId, flag, enabled, description ?? null],
      )),
    );
  }
}
