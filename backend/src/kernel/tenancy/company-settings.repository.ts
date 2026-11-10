import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type { CompanySettings } from './company-settings.types.js';

interface CompanySettingsRow {
  company_id: string;
  currency_code: string;
  locale: string;
  settings: Record<string, unknown>;
  updated_at: Date;
}

@Injectable()
export class CompanySettingsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async get(companyId: string): Promise<CompanySettings> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      let rows = await queryRunner.query(
        `SELECT company_id, currency_code, locale, settings, updated_at
         FROM company_settings
         WHERE company_id = $1`,
        [companyId],
      );

      if (rows.length === 0) {
        rows = await queryRunner.query(
          `INSERT INTO company_settings (company_id)
           VALUES ($1)
           ON CONFLICT (company_id) DO UPDATE SET company_id = EXCLUDED.company_id
           RETURNING company_id, currency_code, locale, settings, updated_at`,
          [companyId],
        );
      }

      return mapSettings(rows[0] as CompanySettingsRow);
    });
  }

  async update(
    companyId: string,
    data: {
      currencyCode?: string;
      locale?: string;
      settings?: Record<string, unknown>;
    },
  ): Promise<CompanySettings> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.currencyCode !== undefined) {
        values.push(data.currencyCode);
        updates.push(`currency_code = $${values.length}`);
      }
      if (data.locale !== undefined) {
        values.push(data.locale);
        updates.push(`locale = $${values.length}`);
      }
      if (data.settings !== undefined) {
        values.push(JSON.stringify(data.settings));
        updates.push(`settings = $${values.length}::jsonb`);
      }

      if (updates.length === 0) {
        const rows = await queryRunner.query(
          `SELECT company_id, currency_code, locale, settings, updated_at
           FROM company_settings WHERE company_id = $1`,
          [companyId],
        );
        return mapSettings(rows[0] as CompanySettingsRow);
      }

      values.push(companyId);
      const rows = await queryRunner.query(
        `UPDATE company_settings
         SET ${updates.join(', ')}
         WHERE company_id = $${values.length}
         RETURNING company_id, currency_code, locale, settings, updated_at`,
        values,
      );

      return mapSettings(rows[0] as CompanySettingsRow);
    });
  }
}

function mapSettings(row: CompanySettingsRow): CompanySettings {
  return {
    companyId: row.company_id,
    currencyCode: row.currency_code,
    locale: row.locale,
    settings: row.settings ?? {},
    updatedAt: row.updated_at.toISOString(),
  };
}
