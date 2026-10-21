import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildWhere } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
import { EXPORT_MAX_ROWS } from '../../common/export/export.types.js';
import { rows, row } from '../../common/utils/db.js';
import type { AnalysisRow } from '../../common/types/db-rows.js';
import type { AnalysisType } from '../types/analysis.types.js';

const ANALYSIS_SORT_COLUMNS: Record<string, string> = {
  name: 'a.name',
  analysis_type: 'a.analysis_type',
  source: 'a.source',
  created_at: 'a.created_at',
  updated_at: 'a.updated_at',
};

const ANALYSIS_LIST_FIELDS = `
  a.id, a.company_id, a.created_by, a.name, a.analysis_type, a.source,
  a.file_name, a.file_size::int AS file_size, a.summary,
  a.created_at, a.updated_at, u.name AS created_by_name
`;

export interface CreateAnalysisData {
  name: string;
  analysis_type: AnalysisType;
  source: string | null;
  file_name?: string | null;
  file_size?: number | null;
  summary: object;
  result: object;
}

@Injectable()
export class AnalysisRepository {
  constructor(private dataSource: DataSource) {}

  async findPagedByCompany(
    companyId: string,
    page = 1,
    limit = 20,
    filters: { search?: string; analysis_type?: AnalysisType } = {},
    sort: SortSpec = {},
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'a.company_id = $?', value: companyId },
        { clause: 'a.deleted_at IS NULL' },
        filters.search
          ? { clause: '(a.name ILIKE $? OR a.file_name ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.analysis_type
          ? { clause: 'a.analysis_type = $?', value: filters.analysis_type }
          : undefined,
      ],
      1,
    );

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM analyses a
       WHERE ${where}`,
      values,
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    const orderBy = buildOrderBy(
      ANALYSIS_SORT_COLUMNS,
      { sortBy: sort.sortBy, sortDir: sort.sortBy ? sort.sortDir : 'desc' },
      'created_at',
    );

    const result = await this.dataSource.query(
      `SELECT ${ANALYSIS_LIST_FIELDS}
       FROM analyses a
       LEFT JOIN users u ON u.id = a.created_by AND u.deleted_at IS NULL
       WHERE ${where}
       ORDER BY ${orderBy}, a.id
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      [...values, safeLimit, offset],
    );

    return {
      data: rows<AnalysisRow>(result),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Misma consulta que `findPagedByCompany`, sin paginación y con tope duro
   * de filas para exportación. La fila extra permite detectar el exceso.
   */
  async findForExport(
    companyId: string,
    filters: { search?: string; analysis_type?: AnalysisType } = {},
    sort: SortSpec = {},
  ) {
    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'a.company_id = $?', value: companyId },
        { clause: 'a.deleted_at IS NULL' },
        filters.search
          ? { clause: '(a.name ILIKE $? OR a.file_name ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.analysis_type
          ? { clause: 'a.analysis_type = $?', value: filters.analysis_type }
          : undefined,
      ],
      1,
    );

    const orderBy = buildOrderBy(
      ANALYSIS_SORT_COLUMNS,
      { sortBy: sort.sortBy, sortDir: sort.sortBy ? sort.sortDir : 'desc' },
      'created_at',
    );

    const result = await this.dataSource.query(
      `SELECT ${ANALYSIS_LIST_FIELDS}
       FROM analyses a
       LEFT JOIN users u ON u.id = a.created_by AND u.deleted_at IS NULL
       WHERE ${where}
       ORDER BY ${orderBy}, a.id
       LIMIT $${nextIndex}`,
      [...values, EXPORT_MAX_ROWS + 1],
    );

    return rows<AnalysisRow>(result);
  }

  async findById(analysisId: string, companyId: string) {
    const result = await this.dataSource.query(
      `SELECT ${ANALYSIS_LIST_FIELDS}, a.result
       FROM analyses a
       LEFT JOIN users u ON u.id = a.created_by AND u.deleted_at IS NULL
       WHERE a.id = $1 AND a.company_id = $2 AND a.deleted_at IS NULL`,
      [analysisId, companyId],
    );
    return row<AnalysisRow>(result) ?? null;
  }

  async create(companyId: string, userId: string, data: CreateAnalysisData) {
    const inserted = await this.dataSource.query(
      `INSERT INTO analyses
        (company_id, created_by, name, analysis_type, source, file_name, file_size, summary, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        companyId,
        userId,
        data.name,
        data.analysis_type,
        data.source,
        data.file_name ?? null,
        data.file_size ?? null,
        JSON.stringify(data.summary),
        JSON.stringify(data.result),
      ],
    );

    const created = await this.findById(inserted[0].id, companyId);
    if (!created) throw new Error('No se pudo recuperar el análisis creado');
    return created;
  }

  async rename(analysisId: string, companyId: string, name: string) {
    const updated = await this.dataSource.query(
      `UPDATE analyses
       SET name = $1
       WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [name, analysisId, companyId],
    );
    if (!updated[0]) return null;

    const result = await this.dataSource.query(
      `SELECT ${ANALYSIS_LIST_FIELDS}
       FROM analyses a
       LEFT JOIN users u ON u.id = a.created_by AND u.deleted_at IS NULL
       WHERE a.id = $1 AND a.company_id = $2 AND a.deleted_at IS NULL`,
      [analysisId, companyId],
    );
    return row<AnalysisRow>(result) ?? null;
  }

  async softDelete(analysisId: string, companyId: string) {
    const result = await this.dataSource.query(
      `UPDATE analyses
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [analysisId, companyId],
    );
    return Boolean(result[0]);
  }
}
