import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { rows, row } from '../common/utils/db.js';
import type { FeatureFlagRow } from '../common/types/db-rows.js';

@Injectable()
export class FeatureFlagsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async isEnabled(companyId: string, flag: string): Promise<boolean> {
    const result = row<{ enabled: boolean }>(await this.dataSource.query(
      `SELECT enabled FROM feature_flags
       WHERE company_id = $1 AND flag = $2`,
      [companyId, flag],
    ));
    return result?.enabled === true;
  }

  async listByCompany(companyId: string): Promise<FeatureFlagRow[]> {
    return rows<FeatureFlagRow>(await this.dataSource.query(
      `SELECT flag, enabled, description, updated_at
       FROM feature_flags
       WHERE company_id = $1
       ORDER BY flag`,
      [companyId],
    ));
  }

  async upsert(
    companyId: string,
    flag: string,
    enabled: boolean,
    description?: string | null,
  ): Promise<FeatureFlagRow | undefined> {
    return row<FeatureFlagRow>(await this.dataSource.query(
      `INSERT INTO feature_flags (company_id, flag, enabled, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, flag)
       DO UPDATE SET enabled = EXCLUDED.enabled,
                     description = COALESCE(EXCLUDED.description, feature_flags.description)
       RETURNING flag, enabled, description, updated_at`,
      [companyId, flag, enabled, description ?? null],
    ));
  }
}
