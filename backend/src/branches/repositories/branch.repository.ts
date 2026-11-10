import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { buildDynamicUpdate, buildWhere } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
import { EXPORT_MAX_ROWS } from '../../common/export/export.types.js';
import { assertMember } from '../../common/utils/membership.helper.js';
import { rows } from '../../common/utils/db.js';
import type { BranchRow } from '../../common/types/db-rows.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';

/**
 * Orden y búsqueda server-side. `location`/`contact` replican las columnas
 * derivadas que el frontend mostraba (ciudad+depto+país, teléfono+email).
 */
const BRANCH_SORT_COLUMNS: Record<string, string> = {
  name: 'b.name',
  city: 'b.city',
  state: 'b.state',
  country: 'b.country',
  location: `COALESCE(b.city, '') || ' ' || COALESCE(b.state, '') || ' ' || COALESCE(b.country, '')`,
  contact: `COALESCE(b.phone, '') || ' ' || COALESCE(b.email, '')`,
  status: 'b.is_active',
  is_active: 'b.is_active',
  created_at: 'b.created_at',
};

const BRANCH_SELECT = `b.id, b.company_id, b.name, b.address, b.city, b.state, b.country,
              b.postal_code, b.phone, b.email, b.is_active, b.code, b.is_main,
              b.timezone, b.manager_user_id, b.created_at, b.updated_at,
              u.name as manager_name`;

@Injectable()
export class BranchRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  /**
   * Alcance de sedes del usuario actual.
   *
   * - `null`: sin restricción (Owner/Admin o usuario sin sedes asignadas).
   * - `string[]`: solo esas sedes.
   * - `[]`: membership inexistente (falla cerrado).
   *
   * La asignación de sedes activa el alcance por usuario; no hay flag de
   * empresa. Un usuario sin sedes mantiene el comportamiento global anterior.
   */
  async getBranchScope(companyId: string): Promise<string[] | null> {
    this.assertCompany(companyId);
    const userId = this.tenantContext.getUserId();
    if (!userId) return null;

    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const result = await queryRunner.query(
        `SELECT
           COALESCE(array_agg(DISTINCT r.name)
             FILTER (WHERE r.name IN ('Owner', 'Admin')), '{}') AS admin_roles,
           COALESCE(array_agg(DISTINCT mb.branch_id)
             FILTER (WHERE mb.branch_id IS NOT NULL), '{}') AS branch_ids
         FROM memberships m
         LEFT JOIN membership_roles mr
           ON mr.membership_id = m.id AND mr.company_id = m.company_id
         LEFT JOIN roles r ON r.id = mr.role_id AND r.deleted_at IS NULL
         LEFT JOIN membership_branches mb
           ON mb.membership_id = m.id AND mb.company_id = m.company_id
         WHERE m.company_id = $1 AND m.user_id = $2 AND m.status = 'active'
         GROUP BY m.id`,
        [companyId, userId],
      );

      const row = result[0];
      if (!row) return [];
      const adminRoles: string[] = row.admin_roles ?? [];
      if (adminRoles.length > 0) return null;

      const branchIds: string[] = row.branch_ids ?? [];
      return branchIds.length > 0 ? branchIds : null;
    });
  }

  async findByCompany(companyId: string, branchScope: string[] | null = null) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      rows(await queryRunner.query(
        `SELECT ${BRANCH_SELECT}
         FROM branches b
         LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
         WHERE b.company_id = $1 AND b.deleted_at IS NULL
           AND ($2::uuid[] IS NULL OR b.id = ANY($2::uuid[]))
         ORDER BY b.name`,
        [companyId, branchScope],
      )),
    );
  }

  async findPagedByCompany(
    companyId: string,
    page = 1,
    limit = 20,
    filters: { search?: string; status?: string } = {},
    sort: SortSpec = {},
    branchScope: string[] | null = null,
  ) {
    this.assertCompany(companyId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'b.company_id = $?', value: companyId },
        { clause: 'b.deleted_at IS NULL' },
        branchScope ? { clause: 'b.id = ANY($?::uuid[])', value: branchScope } : undefined,
        filters.search
          ? { clause: '(b.name ILIKE $? OR b.city ILIKE $? OR b.state ILIKE $? OR b.country ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.status === 'inactive'
          ? { clause: 'b.is_active = FALSE' }
          : filters.status === 'active'
            ? { clause: 'b.is_active = TRUE' }
            : undefined,
      ],
      1,
    );

    const orderBy = buildOrderBy(BRANCH_SORT_COLUMNS, sort, 'name');

    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const countResult = await queryRunner.query(
        `SELECT COUNT(*) as total
         FROM branches b
         WHERE ${where}`,
        values,
      );
      const total = parseInt(countResult[0]?.total || '0', 10);

      const data = await queryRunner.query(
        `SELECT ${BRANCH_SELECT}
         FROM branches b
         LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
         WHERE ${where}
         ORDER BY ${orderBy}, b.name
         LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
        [...values, safeLimit, offset],
      );

      return { data, total, page: safePage, limit: safeLimit };
    });
  }

  /**
   * Misma consulta que `findPagedByCompany`, sin paginación y con tope duro
   * de filas para exportación. La fila extra permite detectar el exceso.
   */
  async findForExport(
    companyId: string,
    filters: { search?: string; status?: string } = {},
    sort: SortSpec = {},
    branchScope: string[] | null = null,
  ) {
    this.assertCompany(companyId);
    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'b.company_id = $?', value: companyId },
        { clause: 'b.deleted_at IS NULL' },
        branchScope ? { clause: 'b.id = ANY($?::uuid[])', value: branchScope } : undefined,
        filters.search
          ? { clause: '(b.name ILIKE $? OR b.city ILIKE $? OR b.state ILIKE $? OR b.country ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.status === 'inactive'
          ? { clause: 'b.is_active = FALSE' }
          : filters.status === 'active'
            ? { clause: 'b.is_active = TRUE' }
            : undefined,
      ],
      1,
    );

    const orderBy = buildOrderBy(BRANCH_SORT_COLUMNS, sort, 'name');

    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      rows<BranchRow>(await queryRunner.query(
        `SELECT ${BRANCH_SELECT}
         FROM branches b
         LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
         WHERE ${where}
         ORDER BY ${orderBy}, b.name
         LIMIT $${nextIndex}`,
        [...values, EXPORT_MAX_ROWS + 1],
      )),
    );
  }

  async findById(branchId: string, companyId: string, branchScope: string[] | null = null) {
    this.assertCompany(companyId);
    if (branchScope && !branchScope.includes(branchId)) return null;
    return withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      (queryRunner) => this.queryById(queryRunner, branchId, companyId),
    );
  }

  async create(companyId: string, data: {
    name: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string;
    code?: string; manager_user_id?: string; timezone?: string;
  }) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      if (data.manager_user_id) {
        await this.assertUserInCompany(queryRunner, data.manager_user_id, companyId);
      }
      const result = await queryRunner.query(
        `INSERT INTO branches (company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone, is_main, is_active, created_at, updated_at`,
        [companyId, data.name, data.address || null, data.city || null, data.state || null,
         data.country || null, data.postal_code || null, data.phone || null, data.email || null,
         data.code || null, data.manager_user_id || null, data.timezone || null],
      );
      return result[0];
    });
  }

  async update(branchId: string, companyId: string, data: {
    name?: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string; is_active?: boolean;
    code?: string; is_main?: boolean; manager_user_id?: string; timezone?: string;
  }) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      if (data.manager_user_id) {
        await this.assertUserInCompany(queryRunner, data.manager_user_id, companyId);
      }
      if (data.is_main === true) {
        await queryRunner.query(
          `UPDATE branches SET is_main = FALSE
           WHERE company_id = $1 AND id != $2 AND deleted_at IS NULL`,
          [companyId, branchId],
        );
      }

      const { updates, values, startIndex } = buildDynamicUpdate(
        data,
        ['name', 'address', 'city', 'state', 'country', 'postal_code', 'phone', 'email', 'is_active', 'code', 'is_main', 'manager_user_id', 'timezone'],
        { nullEmptyStrings: ['address', 'city', 'state', 'country', 'postal_code', 'phone', 'email', 'code', 'manager_user_id', 'timezone'] },
      );

      if (updates.length === 0) {
        return this.queryById(queryRunner, branchId, companyId);
      }

      values.push(branchId, companyId);
      const result = await queryRunner.query(
        `UPDATE branches SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1} AND deleted_at IS NULL
         RETURNING id, company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone, is_main, is_active, created_at, updated_at`,
        values,
      );
      return result[0] || null;
    });
  }

  async softDelete(branchId: string, companyId: string) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const existing = await this.queryById(queryRunner, branchId, companyId);
      if (!existing) {
        throw new NotFoundException('Sede no encontrada');
      }

      const memberCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM membership_branches WHERE branch_id = $1`,
        [branchId],
      );

      if (parseInt(memberCount[0].count) > 0) {
        throw new ConflictException('No se puede eliminar una sede que tiene miembros asignados. Reasigna los miembros primero.');
      }

      await queryRunner.query(
        `UPDATE branches SET deleted_at = NOW() WHERE id = $1 AND company_id = $2`,
        [branchId, companyId],
      );
      return { message: 'Sede eliminada correctamente' };
    });
  }

  private async queryById(queryRunner: QueryRunner, branchId: string, companyId: string) {
    const result = await queryRunner.query(
      `SELECT ${BRANCH_SELECT}
       FROM branches b
       LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
       WHERE b.id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL`,
      [branchId, companyId],
    );
    return result[0] || null;
  }

  private async assertUserInCompany(
    queryRunner: QueryRunner,
    userId: string,
    companyId: string,
  ) {
    await assertMember(
      (sql, params) => queryRunner.query(sql, params),
      userId,
      companyId,
      'El responsable debe ser miembro de la empresa',
    );
  }
}
