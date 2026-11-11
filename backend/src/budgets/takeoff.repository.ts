import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  CreateTakeoffLineInput,
  CreateTakeoffSheetInput,
  TakeoffLineRow,
  TakeoffSheetDetail,
  TakeoffSheetRow,
} from './budgets.types.js';

const SHEET_SELECT = `
  SELECT s.*, bi.name AS budget_item_name,
         (SELECT COUNT(*)::int FROM takeoff_lines tl WHERE tl.sheet_id = s.id)
           AS lines_count,
         COALESCE((SELECT SUM(tl.quantity) FROM takeoff_lines tl
                   WHERE tl.sheet_id = s.id), 0)::float8 AS total_quantity
  FROM takeoff_sheets s
  LEFT JOIN budget_items bi
    ON bi.id = s.budget_item_id AND bi.company_id = s.company_id
`;

@Injectable()
export class TakeoffRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async listSheets(companyId: string, projectId: string): Promise<TakeoffSheetRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${SHEET_SELECT}
         WHERE s.company_id = $1 AND s.project_id = $2 AND s.deleted_at IS NULL
         ORDER BY s.created_at`,
        [companyId, projectId],
      )) as TakeoffSheetRow[];
      return rows.map(mapSheet);
    });
  }

  async findSheetById(companyId: string, id: string): Promise<TakeoffSheetRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `${SHEET_SELECT}
         WHERE s.id = $1 AND s.company_id = $2 AND s.deleted_at IS NULL`,
        [id, companyId],
      )) as TakeoffSheetRow[];
      return rows[0] ? mapSheet(rows[0]) : null;
    });
  }

  async getDetail(companyId: string, id: string): Promise<TakeoffSheetDetail | null> {
    const sheet = await this.findSheetById(companyId, id);
    if (!sheet) return null;
    const lines = await this.listLines(companyId, id);
    return { ...sheet, lines };
  }

  async createSheet(
    companyId: string,
    userId: string,
    projectId: string,
    input: CreateTakeoffSheetInput,
  ): Promise<TakeoffSheetDetail | null> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO takeoff_sheets
           (company_id, project_id, budget_item_id, name, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          companyId,
          projectId,
          input.budgetItemId ?? null,
          input.name,
          input.description ?? null,
          userId,
        ],
      )) as Array<{ id: string }>;
      return rows[0]!.id;
    });
    return this.getDetail(companyId, id);
  }

  async updateSheet(
    companyId: string,
    id: string,
    input: {
      name?: string;
      description?: string | null;
      budgetItemId?: string | null;
      status?: string;
    },
  ): Promise<TakeoffSheetRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          name: input.name,
          description: input.description,
          budget_item_id: input.budgetItemId,
          status: input.status,
        },
        ['name', 'description', 'budget_item_id', 'status'],
        { nullEmptyStrings: ['description', 'budget_item_id'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE takeoff_sheets SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING id`,
        values,
      )) as Array<{ id: string }>;
      if (!rows[0]) return null;
      return this.findSheetById(companyId, id);
    });
  }

  async deleteSheet(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE takeoff_sheets SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listLines(companyId: string, sheetId: string): Promise<TakeoffLineRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return this.listLinesWithRunner(queryRunner, companyId, sheetId);
    });
  }

  async createLine(
    companyId: string,
    sheetId: string,
    input: CreateTakeoffLineInput,
    quantity: number,
  ): Promise<TakeoffLineRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO takeoff_lines
           (company_id, sheet_id, description, unit_id, parts, length, width,
            height, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          companyId,
          sheetId,
          input.description,
          input.unitId,
          input.parts ?? 1,
          input.length ?? 0,
          input.width ?? 0,
          input.height ?? 0,
          quantity,
          input.notes ?? null,
        ],
      )) as Array<{ id: string }>;
      const lines = await this.listLinesWithRunner(queryRunner, companyId, sheetId);
      return lines.find((line) => line.id === rows[0]!.id) ?? null;
    });
  }

  async updateLine(
    companyId: string,
    sheetId: string,
    lineId: string,
    input: Partial<CreateTakeoffLineInput>,
    quantity?: number,
  ): Promise<TakeoffLineRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          description: input.description,
          unit_id: input.unitId,
          parts: input.parts,
          length: input.length,
          width: input.width,
          height: input.height,
          quantity,
          notes: input.notes,
        },
        ['description', 'unit_id', 'parts', 'length', 'width', 'height', 'quantity', 'notes'],
        { nullEmptyStrings: ['notes'] },
      );
      values.push(lineId, sheetId, companyId);
      await queryRunner.query(
        `UPDATE takeoff_lines SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND sheet_id = $${startIndex + 1}
           AND company_id = $${startIndex + 2}`,
        values,
      );
      const lines = await this.listLinesWithRunner(queryRunner, companyId, sheetId);
      return lines.find((line) => line.id === lineId) ?? null;
    });
  }

  async deleteLine(companyId: string, sheetId: string, lineId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM takeoff_lines
         WHERE id = $1 AND sheet_id = $2 AND company_id = $3 RETURNING id`,
        [lineId, sheetId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async findLineById(companyId: string, lineId: string): Promise<TakeoffLineRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT tl.*, u.code AS unit_code, u.name AS unit_name
         FROM takeoff_lines tl
         JOIN units_of_measure u ON u.id = tl.unit_id
         WHERE tl.id = $1 AND tl.company_id = $2`,
        [lineId, companyId],
      )) as TakeoffLineRow[];
      return rows[0] ? mapLine(rows[0]) : null;
    });
  }

  private async listLinesWithRunner(
    queryRunner: { query(sql: string, parameters?: unknown[]): Promise<unknown> },
    companyId: string,
    sheetId: string,
  ): Promise<TakeoffLineRow[]> {
    const rows = (await queryRunner.query(
      `SELECT tl.*, u.code AS unit_code, u.name AS unit_name
       FROM takeoff_lines tl
       JOIN units_of_measure u ON u.id = tl.unit_id
       WHERE tl.company_id = $1 AND tl.sheet_id = $2
       ORDER BY tl.created_at`,
      [companyId, sheetId],
    )) as TakeoffLineRow[];
    return rows.map(mapLine);
  }
}

function mapSheet(row: TakeoffSheetRow): TakeoffSheetRow {
  return { ...row, total_quantity: Number(row.total_quantity) };
}

function mapLine(row: TakeoffLineRow): TakeoffLineRow {
  return {
    ...row,
    parts: Number(row.parts),
    length: Number(row.length),
    width: Number(row.width),
    height: Number(row.height),
    quantity: Number(row.quantity),
  };
}
