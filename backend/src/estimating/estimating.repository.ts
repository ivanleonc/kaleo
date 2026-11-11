import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  ApuBaseRow,
  ApuDetail,
  ApuLineRow,
  ApuRow,
  ApuVersionRow,
  CreateApuInput,
  CreateApuLineInput,
  CreateResourceInput,
  ResourcePriceRow,
  ResourceRow,
  ResourceType,
  UpdateResourceInput,
} from './estimating.types.js';

@Injectable()
export class EstimatingRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  // ─── Recursos ─────────────────────────────────────────────────────────────
  async listResources(
    companyId: string,
    filters: { search?: string; resourceType?: ResourceType },
  ): Promise<ResourceRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['r.company_id = $1', 'r.deleted_at IS NULL'];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(`(r.code ILIKE $${values.length} OR r.name ILIKE $${values.length})`);
      }
      if (filters.resourceType) {
        values.push(filters.resourceType);
        where.push(`r.resource_type = $${values.length}`);
      }
      const rows = (await queryRunner.query(
        `SELECT r.*, u.code AS unit_code, u.name AS unit_name
         FROM resources r
         JOIN units_of_measure u ON u.id = r.unit_id
         WHERE ${where.join(' AND ')}
         ORDER BY r.resource_type, r.name`,
        values,
      )) as ResourceRow[];
      return rows.map(mapResource);
    });
  }

  async findResourceById(companyId: string, id: string): Promise<ResourceRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT r.*, u.code AS unit_code, u.name AS unit_name
         FROM resources r
         JOIN units_of_measure u ON u.id = r.unit_id
         WHERE r.id = $1 AND r.company_id = $2 AND r.deleted_at IS NULL`,
        [id, companyId],
      )) as ResourceRow[];
      return rows[0] ? mapResource(rows[0]) : null;
    });
  }

  async findResourceByCode(companyId: string, code: string): Promise<ResourceRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT r.*, ''::text AS unit_code, ''::text AS unit_name
         FROM resources r
         WHERE r.company_id = $1 AND lower(r.code) = lower($2) AND r.deleted_at IS NULL
         LIMIT 1`,
        [companyId, code],
      )) as ResourceRow[];
      return rows[0] ? mapResource(rows[0]) : null;
    });
  }

  async createResource(
    companyId: string,
    userId: string,
    input: CreateResourceInput,
  ): Promise<ResourceRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO resources
           (company_id, resource_type, code, name, description, unit_id,
            base_cost, currency_code, catalog_item_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
         RETURNING id`,
        [
          companyId,
          input.resourceType,
          input.code,
          input.name,
          input.description ?? null,
          input.unitId,
          input.baseCost,
          input.currencyCode,
          input.catalogItemId ?? null,
          input.isActive ?? true,
          userId,
        ],
      )) as Array<{ id: string }>;
      return (await this.findResourceWithRunner(queryRunner, companyId, rows[0]!.id))!;
    });
  }

  async updateResource(
    companyId: string,
    userId: string,
    id: string,
    input: UpdateResourceInput,
  ): Promise<ResourceRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          resource_type: input.resourceType,
          code: input.code,
          name: input.name,
          description: input.description,
          unit_id: input.unitId,
          base_cost: input.baseCost,
          currency_code: input.currencyCode,
          catalog_item_id: input.catalogItemId,
          is_active: input.isActive,
          updated_by: userId,
        },
        [
          'resource_type',
          'code',
          'name',
          'description',
          'unit_id',
          'base_cost',
          'currency_code',
          'catalog_item_id',
          'is_active',
          'updated_by',
        ],
        {
          nullEmptyStrings: ['description', 'catalog_item_id'],
          extraSet: ['updated_at = now()'],
        },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE resources SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL`,
        values,
      );
      return this.findResourceWithRunner(queryRunner, companyId, id);
    });
  }

  async deleteResource(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE resources SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listResourcePrices(companyId: string, resourceId: string): Promise<ResourcePriceRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT rp.*, p.name AS supplier_name
         FROM resource_prices rp
         LEFT JOIN parties p ON p.id = rp.supplier_party_id AND p.company_id = rp.company_id
         WHERE rp.company_id = $1 AND rp.resource_id = $2
         ORDER BY rp.valid_from DESC NULLS LAST, rp.created_at DESC`,
        [companyId, resourceId],
      )) as ResourcePriceRow[];
      return rows.map(mapResourcePrice);
    });
  }

  async addResourcePrice(
    companyId: string,
    resourceId: string,
    input: {
      supplierPartyId?: string | null;
      price: number;
      currencyCode: string;
      validFrom?: string | null;
      validTo?: string | null;
      source?: string | null;
    },
  ): Promise<ResourcePriceRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO resource_prices
           (company_id, resource_id, supplier_party_id, price, currency_code,
            valid_from, valid_to, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          companyId,
          resourceId,
          input.supplierPartyId ?? null,
          input.price,
          input.currencyCode,
          input.validFrom ?? null,
          input.validTo ?? null,
          input.source ?? null,
        ],
      )) as Array<{ id: string }>;
      const prices = await this.listResourcePricesWithRunner(queryRunner, companyId, resourceId);
      return prices.find((price) => price.id === rows[0]!.id)!;
    });
  }

  async unitExists(companyId: string, unitId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM units_of_measure
         WHERE id = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL`,
        [unitId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async findUnitIdByCode(companyId: string, code: string): Promise<string | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM units_of_measure
         WHERE lower(code) = lower($1)
           AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL
         LIMIT 1`,
        [code, companyId],
      )) as Array<{ id: string }>;
      return rows[0]?.id ?? null;
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

  async catalogItemExists(companyId: string, itemId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM catalog_items
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [itemId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

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

  async deleteResourcePrice(
    companyId: string,
    resourceId: string,
    priceId: string,
  ): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM resource_prices
         WHERE id = $1 AND resource_id = $2 AND company_id = $3 RETURNING id`,
        [priceId, resourceId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  // ─── Bases APU ────────────────────────────────────────────────────────────
  async listApuBases(companyId: string): Promise<ApuBaseRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return (await queryRunner.query(
        `SELECT b.*,
                (SELECT COUNT(*)::int FROM apus a
                 WHERE a.base_id = b.id AND a.company_id = b.company_id AND a.deleted_at IS NULL)
                  AS apus_count
         FROM apu_bases b
         WHERE b.company_id = $1 AND b.deleted_at IS NULL
         ORDER BY b.name`,
        [companyId],
      )) as ApuBaseRow[];
    });
  }

  async findApuBaseById(companyId: string, id: string): Promise<ApuBaseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT b.*, 0 AS apus_count FROM apu_bases b
         WHERE b.id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL`,
        [id, companyId],
      )) as ApuBaseRow[];
      return rows[0] ?? null;
    });
  }

  async findApuBaseByCode(companyId: string, code: string): Promise<ApuBaseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT b.*, 0 AS apus_count FROM apu_bases b
         WHERE b.company_id = $1 AND lower(b.code) = lower($2) AND b.deleted_at IS NULL LIMIT 1`,
        [companyId, code],
      )) as ApuBaseRow[];
      return rows[0] ?? null;
    });
  }

  async createApuBase(
    companyId: string,
    input: { code: string; name: string; description?: string | null; source?: string | null; isActive?: boolean },
  ): Promise<ApuBaseRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO apu_bases (company_id, code, name, description, source, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *, 0 AS apus_count`,
        [companyId, input.code, input.name, input.description ?? null, input.source ?? null, input.isActive ?? true],
      )) as ApuBaseRow[];
      return rows[0]!;
    });
  }

  async updateApuBase(
    companyId: string,
    id: string,
    input: { code?: string; name?: string; description?: string | null; source?: string | null; isActive?: boolean },
  ): Promise<ApuBaseRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          code: input.code,
          name: input.name,
          description: input.description,
          source: input.source,
          is_active: input.isActive,
        },
        ['code', 'name', 'description', 'source', 'is_active'],
        { nullEmptyStrings: ['description', 'source'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE apu_bases SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING *, 0 AS apus_count`,
        values,
      )) as ApuBaseRow[];
      return rows[0] ?? null;
    });
  }

  async deleteApuBase(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE apu_bases SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  // ─── APUs ────────────────────────────────────────────────────────────────
  async listApus(
    companyId: string,
    filters: { search?: string; baseId?: string },
  ): Promise<ApuRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['a.company_id = $1', 'a.deleted_at IS NULL'];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(`(a.code ILIKE $${values.length} OR a.name ILIKE $${values.length})`);
      }
      if (filters.baseId) {
        values.push(filters.baseId);
        where.push(`a.base_id = $${values.length}`);
      }
      const rows = (await queryRunner.query(
        `${APU_SELECT}
         WHERE ${where.join(' AND ')}
         ORDER BY b.name, a.code`,
        values,
      )) as ApuRow[];
      return rows.map(mapApu);
    });
  }

  async findApuById(companyId: string, id: string): Promise<ApuRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${APU_SELECT}
         WHERE a.id = $1 AND a.company_id = $2 AND a.deleted_at IS NULL`,
        [id, companyId],
      )) as ApuRow[];
      return rows[0] ? mapApu(rows[0]) : null;
    });
  }

  async findApuByCode(companyId: string, baseId: string, code: string): Promise<ApuRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${APU_SELECT}
         WHERE a.company_id = $1 AND a.base_id = $2 AND lower(a.code) = lower($3)
           AND a.deleted_at IS NULL LIMIT 1`,
        [companyId, baseId, code],
      )) as ApuRow[];
      return rows[0] ? mapApu(rows[0]) : null;
    });
  }

  async getApuDetail(companyId: string, id: string): Promise<ApuDetail | null> {
    const apu = await this.findApuById(companyId, id);
    if (!apu) return null;
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const versions = (await queryRunner.query(
        `SELECT * FROM apu_versions
         WHERE company_id = $1 AND apu_id = $2 ORDER BY version_number DESC`,
        [companyId, id],
      )) as ApuVersionRow[];
      const lines = apu.current_version_id
        ? await this.listLinesWithRunner(queryRunner, companyId, apu.current_version_id)
        : [];
      return { ...apu, versions: versions.map(mapVersion), lines };
    });
  }

  async createApu(
    companyId: string,
    userId: string,
    input: CreateApuInput,
  ): Promise<ApuDetail> {
    this.assertCompany(companyId);
    const apuId = await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO apus
           (company_id, base_id, code, name, description, unit_id, status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          companyId,
          input.baseId,
          input.code,
          input.name,
          input.description ?? null,
          input.unitId,
          input.status ?? 'active',
          userId,
        ],
      )) as Array<{ id: string }>;
      const id = rows[0]!.id;
      const version = (await queryRunner.query(
        `INSERT INTO apu_versions (company_id, apu_id, version_number, status)
         VALUES ($1, $2, 1, 'draft') RETURNING id`,
        [companyId, id],
      )) as Array<{ id: string }>;
      await queryRunner.query(
        `UPDATE apus SET current_version_id = $3 WHERE id = $1 AND company_id = $2`,
        [id, companyId, version[0]!.id],
      );
      return id;
    });
    const detail = await this.getApuDetail(companyId, apuId);
    return detail!;
  }

  async updateApu(
    companyId: string,
    userId: string,
    id: string,
    input: { code?: string; name?: string; description?: string | null; unitId?: string; status?: string },
  ): Promise<ApuDetail | null> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          code: input.code,
          name: input.name,
          description: input.description,
          unit_id: input.unitId,
          status: input.status,
          updated_by: userId,
        },
        ['code', 'name', 'description', 'unit_id', 'status', 'updated_by'],
        { nullEmptyStrings: ['description'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE apus SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL`,
        values,
      );
    });
    return this.getApuDetail(companyId, id);
  }

  async deleteApu(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE apus SET deleted_at = now(), status = 'archived'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async createApuVersion(
    companyId: string,
    userId: string,
    apuId: string,
  ): Promise<ApuDetail | null> {
    this.assertCompany(companyId);
    const apu = await this.findApuById(companyId, apuId);
    if (!apu) return null;
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const numberRows = (await queryRunner.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next
         FROM apu_versions WHERE company_id = $1 AND apu_id = $2`,
        [companyId, apuId],
      )) as Array<{ next: number }>;
      const next = Number(numberRows[0]?.next ?? 1);
      const versionRows = (await queryRunner.query(
        `INSERT INTO apu_versions (company_id, apu_id, version_number, status)
         VALUES ($1, $2, $3, 'draft') RETURNING id`,
        [companyId, apuId, next],
      )) as Array<{ id: string }>;
      const newVersionId = versionRows[0]!.id;
      if (apu.current_version_id) {
        await queryRunner.query(
          `INSERT INTO apu_lines
             (company_id, apu_version_id, resource_id, component_type, quantity,
              waste_pct, performance, unit_cost_snapshot, currency_code, sort_order, notes)
           SELECT company_id, $2, resource_id, component_type, quantity,
                  waste_pct, performance, unit_cost_snapshot, currency_code, sort_order, notes
           FROM apu_lines WHERE company_id = $1 AND apu_version_id = $3`,
          [companyId, newVersionId, apu.current_version_id],
        );
      }
      await queryRunner.query(
        `UPDATE apus SET current_version_id = $3, status = 'active', updated_by = $4
         WHERE id = $1 AND company_id = $2`,
        [apuId, companyId, newVersionId, userId],
      );
    });
    return this.getApuDetail(companyId, apuId);
  }

  async addLine(
    companyId: string,
    versionId: string,
    input: CreateApuLineInput,
  ): Promise<ApuLineRow> {
    this.assertCompany(companyId);
    const resource = await this.findResourceById(companyId, input.resourceId);
    if (!resource) throw new Error('Recurso no encontrado');
    const rows = await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const version = (await queryRunner.query(
        `SELECT id, status FROM apu_versions
         WHERE id = $1 AND company_id = $2`,
        [versionId, companyId],
      )) as Array<{ id: string; status: string }>;
      if (!version[0]) throw new Error('Versión de APU no encontrada');
      if (version[0].status !== 'draft') throw new Error('La versión del APU está bloqueada');
      const line = (await queryRunner.query(
        `INSERT INTO apu_lines
           (company_id, apu_version_id, resource_id, component_type, quantity,
            waste_pct, performance, unit_cost_snapshot, currency_code, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          companyId,
          versionId,
          input.resourceId,
          resource.resource_type,
          input.quantity,
          input.wastePct ?? 0,
          input.performance ?? 1,
          resource.base_cost,
          resource.currency_code,
          input.notes ?? null,
        ],
      )) as Array<{ id: string }>;
      const lines = await this.listLinesWithRunner(queryRunner, companyId, versionId);
      return lines.find((item) => item.id === line[0]!.id)!;
    });
    return rows;
  }

  async updateLine(
    companyId: string,
    lineId: string,
    input: { quantity?: number; wastePct?: number; performance?: number; notes?: string | null },
  ): Promise<ApuLineRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const current = (await queryRunner.query(
        `SELECT l.apu_version_id, v.status
         FROM apu_lines l JOIN apu_versions v ON v.id = l.apu_version_id
         WHERE l.id = $1 AND l.company_id = $2`,
        [lineId, companyId],
      )) as Array<{ apu_version_id: string; status: string }>;
      if (!current[0] || current[0].status !== 'draft') return null;
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          quantity: input.quantity,
          waste_pct: input.wastePct,
          performance: input.performance,
          notes: input.notes,
        },
        ['quantity', 'waste_pct', 'performance', 'notes'],
        { nullEmptyStrings: ['notes'] },
      );
      values.push(lineId, companyId);
      await queryRunner.query(
        `UPDATE apu_lines SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}`,
        values,
      );
      const lines = await this.listLinesWithRunner(queryRunner, companyId, current[0].apu_version_id);
      return lines.find((line) => line.id === lineId) ?? null;
    });
  }

  async deleteLine(companyId: string, lineId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM apu_lines l
         USING apu_versions v
         WHERE l.id = $1 AND l.company_id = $2
           AND v.id = l.apu_version_id AND v.status = 'draft'
         RETURNING l.id`,
        [lineId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async approveVersion(companyId: string, userId: string, versionId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id, apu_id FROM apu_versions WHERE id = $1 AND company_id = $2`,
        [versionId, companyId],
      )) as Array<{ id: string; apu_id: string }>;
      if (!rows[0]) return false;
      await queryRunner.query(
        `UPDATE apu_versions SET status = 'superseded'
         WHERE company_id = $1 AND apu_id = $2 AND id <> $3 AND status = 'approved'`,
        [companyId, rows[0].apu_id, versionId],
      );
      await queryRunner.query(
        `UPDATE apu_versions SET status = 'approved', approved_by = $3, approved_at = now()
         WHERE id = $1 AND company_id = $2`,
        [versionId, companyId, userId],
      );
      await queryRunner.query(
        `UPDATE apus SET current_version_id = $3, status = 'active', updated_by = $4
         WHERE id = $1 AND company_id = $2`,
        [rows[0].apu_id, companyId, versionId, userId],
      );
      return true;
    });
  }

  async versionBelongsToCompany(companyId: string, versionId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM apu_versions WHERE id = $1 AND company_id = $2`,
        [versionId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  private async findResourceWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    id: string,
  ): Promise<ResourceRow | null> {
    const rows = (await queryRunner.query(
      `SELECT r.*, u.code AS unit_code, u.name AS unit_name
       FROM resources r JOIN units_of_measure u ON u.id = r.unit_id
       WHERE r.id = $1 AND r.company_id = $2 AND r.deleted_at IS NULL`,
      [id, companyId],
    )) as ResourceRow[];
    return rows[0] ? mapResource(rows[0]) : null;
  }

  private async listResourcePricesWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    resourceId: string,
  ): Promise<ResourcePriceRow[]> {
    const rows = (await queryRunner.query(
      `SELECT rp.*, p.name AS supplier_name
       FROM resource_prices rp
       LEFT JOIN parties p ON p.id = rp.supplier_party_id AND p.company_id = rp.company_id
       WHERE rp.company_id = $1 AND rp.resource_id = $2
       ORDER BY rp.valid_from DESC NULLS LAST, rp.created_at DESC`,
      [companyId, resourceId],
    )) as ResourcePriceRow[];
    return rows.map(mapResourcePrice);
  }

  private async listLinesWithRunner(
    queryRunner: QueryRunner,
    companyId: string,
    versionId: string,
  ): Promise<ApuLineRow[]> {
    const rows = (await queryRunner.query(
      `SELECT l.*, r.code AS resource_code, r.name AS resource_name,
              u.code AS unit_code,
              (l.quantity * (1 + l.waste_pct / 100) * l.performance * l.unit_cost_snapshot)::float8
                AS partial_amount
       FROM apu_lines l
       JOIN resources r ON r.id = l.resource_id
       JOIN units_of_measure u ON u.id = r.unit_id
       WHERE l.company_id = $1 AND l.apu_version_id = $2
       ORDER BY l.component_type, l.sort_order, r.name`,
      [companyId, versionId],
    )) as ApuLineRow[];
    return rows.map(mapLine);
  }
}

const APU_SELECT = `
  SELECT a.*, b.name AS base_name,
         u.code AS unit_code, u.name AS unit_name,
         v.version_number AS current_version_number,
         v.status AS current_version_status,
         (SELECT COUNT(*)::int FROM apu_lines l WHERE l.apu_version_id = a.current_version_id)
           AS lines_count,
         COALESCE((
           SELECT SUM(l.quantity * (1 + l.waste_pct / 100) * l.performance * l.unit_cost_snapshot)
           FROM apu_lines l WHERE l.apu_version_id = a.current_version_id
         ), 0)::float8 AS unit_cost
  FROM apus a
  JOIN apu_bases b ON b.id = a.base_id AND b.company_id = a.company_id
  JOIN units_of_measure u ON u.id = a.unit_id
  LEFT JOIN apu_versions v ON v.id = a.current_version_id AND v.company_id = a.company_id
`;

function mapResource(row: ResourceRow): ResourceRow {
  return { ...row, base_cost: Number(row.base_cost) };
}

function mapResourcePrice(row: ResourcePriceRow): ResourcePriceRow {
  return { ...row, price: Number(row.price) };
}

function mapApu(row: ApuRow): ApuRow {
  return { ...row, unit_cost: Number(row.unit_cost) };
}

function mapVersion(row: ApuVersionRow): ApuVersionRow {
  return {
    ...row,
    output_quantity: Number(row.output_quantity),
    performance: row.performance === null ? null : Number(row.performance),
  };
}

function mapLine(row: ApuLineRow): ApuLineRow {
  return {
    ...row,
    quantity: Number(row.quantity),
    waste_pct: Number(row.waste_pct),
    performance: Number(row.performance),
    unit_cost_snapshot: Number(row.unit_cost_snapshot),
    partial_amount: Number(row.partial_amount),
  };
}
