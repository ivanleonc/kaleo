import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  CurrencyRow,
  TaxRateFilters,
  TaxRateRow,
  UnitConversionRow,
  UnitFilters,
  UnitRow,
} from './catalog.types.js';

@Injectable()
export class CatalogRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async listCurrencies(): Promise<CurrencyRow[]> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return (await queryRunner.query(
        `SELECT code, name, symbol, decimal_digits, is_active
         FROM currencies WHERE is_active ORDER BY code`,
      )) as CurrencyRow[];
    });
  }

  async listUnits(companyId: string, filters: UnitFilters): Promise<UnitRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = [
        '(u.company_id IS NULL OR u.company_id = $1)',
        'u.deleted_at IS NULL',
      ];

      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(`(u.code ILIKE $${values.length} OR u.name ILIKE $${values.length})`);
      }
      if (filters.kind) {
        values.push(filters.kind);
        where.push(`u.kind = $${values.length}`);
      }
      if (!filters.includeInactive) {
        where.push('u.is_active = true');
      }

      return (await queryRunner.query(
        `SELECT u.*,
                (u.company_id IS NULL) AS is_global,
                (SELECT COUNT(*)::int FROM unit_conversions c
                 WHERE c.from_unit_id = u.id OR c.to_unit_id = u.id) AS conversions_count
         FROM units_of_measure u
         WHERE ${where.join(' AND ')}
         ORDER BY u.kind, u.name`,
        values,
      )) as UnitRow[];
    });
  }

  async findUnitById(companyId: string, unitId: string): Promise<UnitRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT u.*, (u.company_id IS NULL) AS is_global, 0 AS conversions_count
         FROM units_of_measure u
         WHERE u.id = $1
           AND (u.company_id IS NULL OR u.company_id = $2)
           AND u.deleted_at IS NULL`,
        [unitId, companyId],
      )) as UnitRow[];
      return rows[0] ?? null;
    });
  }

  async findUnitByCode(companyId: string, code: string): Promise<UnitRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT u.*, (u.company_id IS NULL) AS is_global, 0 AS conversions_count
         FROM units_of_measure u
         WHERE (u.company_id IS NULL OR u.company_id = $1)
           AND lower(u.code) = lower($2)
           AND u.deleted_at IS NULL
         LIMIT 1`,
        [companyId, code],
      )) as UnitRow[];
      return rows[0] ?? null;
    });
  }

  async createUnit(
    companyId: string,
    input: {
      code: string;
      name: string;
      kind: string;
      precision: number;
      isActive?: boolean;
    },
  ): Promise<UnitRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO units_of_measure
           (company_id, code, name, kind, precision, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *, false AS is_global, 0 AS conversions_count`,
        [
          companyId,
          input.code,
          input.name,
          input.kind,
          input.precision,
          input.isActive ?? true,
        ],
      )) as UnitRow[];
      return rows[0]!;
    });
  }

  async updateUnit(
    companyId: string,
    unitId: string,
    patch: {
      code?: string;
      name?: string;
      kind?: string;
      precision?: number;
      isActive?: boolean;
    },
  ): Promise<UnitRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          code: patch.code,
          name: patch.name,
          kind: patch.kind,
          precision: patch.precision,
          is_active: patch.isActive,
        },
        ['code', 'name', 'kind', 'precision', 'is_active'],
        { extraSet: ['updated_at = now()'] },
      );
      values.push(unitId, companyId);
      const rows = (await queryRunner.query(
        `UPDATE units_of_measure
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING *, false AS is_global, 0 AS conversions_count`,
        values,
      )) as UnitRow[];
      return rows[0] ?? null;
    });
  }

  async deleteUnit(companyId: string, unitId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE units_of_measure
         SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [unitId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listConversions(companyId: string, unitId: string): Promise<UnitConversionRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT c.*, f.code AS from_code, f.name AS from_name,
                t.code AS to_code, t.name AS to_name
         FROM unit_conversions c
         JOIN units_of_measure f ON f.id = c.from_unit_id AND f.deleted_at IS NULL
         JOIN units_of_measure t ON t.id = c.to_unit_id AND t.deleted_at IS NULL
         WHERE (c.company_id IS NULL OR c.company_id = $1)
           AND (c.from_unit_id = $2 OR c.to_unit_id = $2)
         ORDER BY f.name, t.name`,
        [companyId, unitId],
      )) as UnitConversionRow[];
      return rows.map(mapConversion);
    });
  }

  async findConversion(
    companyId: string,
    fromUnitId: string,
    toUnitId: string,
  ): Promise<UnitConversionRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT c.*, f.code AS from_code, f.name AS from_name,
                t.code AS to_code, t.name AS to_name
         FROM unit_conversions c
         JOIN units_of_measure f ON f.id = c.from_unit_id AND f.deleted_at IS NULL
         JOIN units_of_measure t ON t.id = c.to_unit_id AND t.deleted_at IS NULL
         WHERE (c.company_id IS NULL OR c.company_id = $1)
           AND c.from_unit_id = $2 AND c.to_unit_id = $3
         LIMIT 1`,
        [companyId, fromUnitId, toUnitId],
      )) as UnitConversionRow[];
      return rows[0] ? mapConversion(rows[0]) : null;
    });
  }

  async createConversion(
    companyId: string,
    fromUnitId: string,
    toUnitId: string,
    factor: number,
  ): Promise<UnitConversionRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO unit_conversions (company_id, from_unit_id, to_unit_id, factor)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [companyId, fromUnitId, toUnitId, factor],
      )) as UnitConversionRow[];
      const conversion = rows[0]!;
      const units = (await queryRunner.query(
        `SELECT id, code, name FROM units_of_measure WHERE id = ANY($1::uuid[])`,
        [[fromUnitId, toUnitId]],
      )) as Array<{ id: string; code: string; name: string }>;
      const from = units.find((unit) => unit.id === fromUnitId);
      const to = units.find((unit) => unit.id === toUnitId);
      return mapConversion({
        ...conversion,
        from_code: from?.code ?? '',
        from_name: from?.name ?? '',
        to_code: to?.code ?? '',
        to_name: to?.name ?? '',
      });
    });
  }

  async deleteConversion(companyId: string, conversionId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM unit_conversions
         WHERE id = $1 AND company_id = $2
         RETURNING id`,
        [conversionId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listTaxRates(companyId: string, filters: TaxRateFilters): Promise<TaxRateRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['company_id = $1', 'deleted_at IS NULL'];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(`(code ILIKE $${values.length} OR name ILIKE $${values.length})`);
      }
      if (!filters.includeInactive) where.push('is_active = true');
      const rows = (await queryRunner.query(
        `SELECT * FROM tax_rates
         WHERE ${where.join(' AND ')}
         ORDER BY rate DESC, name`,
        values,
      )) as TaxRateRow[];
      return rows.map(mapTaxRate);
    });
  }

  async findTaxRateById(companyId: string, id: string): Promise<TaxRateRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM tax_rates
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId],
      )) as TaxRateRow[];
      return rows[0] ? mapTaxRate(rows[0]) : null;
    });
  }

  async findTaxRateByCode(companyId: string, code: string): Promise<TaxRateRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM tax_rates
         WHERE company_id = $1 AND lower(code) = lower($2) AND deleted_at IS NULL
         LIMIT 1`,
        [companyId, code],
      )) as TaxRateRow[];
      return rows[0] ? mapTaxRate(rows[0]) : null;
    });
  }

  async createTaxRate(
    companyId: string,
    input: {
      code: string;
      name: string;
      rate: number;
      countryCode: string | null;
      isActive: boolean;
    },
  ): Promise<TaxRateRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO tax_rates
           (company_id, code, name, rate, country_code, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          companyId,
          input.code,
          input.name,
          input.rate,
          input.countryCode,
          input.isActive,
        ],
      )) as TaxRateRow[];
      return mapTaxRate(rows[0]!);
    });
  }

  async updateTaxRate(
    companyId: string,
    id: string,
    patch: {
      code?: string;
      name?: string;
      rate?: number;
      countryCode?: string | null;
      isActive?: boolean;
    },
  ): Promise<TaxRateRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          code: patch.code,
          name: patch.name,
          rate: patch.rate,
          country_code: patch.countryCode,
          is_active: patch.isActive,
        },
        ['code', 'name', 'rate', 'country_code', 'is_active'],
        { nullEmptyStrings: ['country_code'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE tax_rates
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING *`,
        values,
      )) as TaxRateRow[];
      return rows[0] ? mapTaxRate(rows[0]) : null;
    });
  }

  async deleteTaxRate(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE tax_rates
         SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }
}

function mapConversion(row: UnitConversionRow): UnitConversionRow {
  return { ...row, factor: Number(row.factor) };
}

function mapTaxRate(row: TaxRateRow): TaxRateRow {
  return { ...row, rate: Number(row.rate) };
}
