import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PROTECTED_ROLES } from '../../common/constants/roles.js';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { rows, row } from '../../common/utils/db.js';
import type { RoleRow } from '../../common/types/db-rows.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';

@Injectable()
export class RoleRepository {
  constructor(
    private dataSource: DataSource,
    private tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async findAll(companyId?: string): Promise<RoleRow[]> {
    if (companyId) {
      this.assertCompany(companyId);
      return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
        rows<RoleRow>(await queryRunner.query(
          `SELECT id, name, description, color, company_id FROM roles
           WHERE (company_id IS NULL OR company_id = $1) AND deleted_at IS NULL
           ORDER BY name`,
          [companyId],
        )),
      );
    }
    return rows<RoleRow>(await this.dataSource.query(
      `SELECT id, name, description, color, company_id FROM roles WHERE deleted_at IS NULL ORDER BY name`,
    ));
  }

  async findById(id: string): Promise<RoleRow | undefined> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      row<RoleRow>(await queryRunner.query(
        `SELECT id, name, description, color, company_id FROM roles WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      )),
    );
  }

  async findByName(name: string, companyId?: string): Promise<RoleRow | undefined> {
    if (companyId) {
      return row<RoleRow>(await this.dataSource.query(
        `SELECT id, name, description, color, company_id FROM roles
         WHERE name = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL`,
        [name, companyId],
      ));
    }
    return row<RoleRow>(await this.dataSource.query(
      `SELECT id, name, description, color, company_id FROM roles WHERE name = $1 AND deleted_at IS NULL`,
      [name],
    ));
  }

  async create(name: string, companyId?: string, description?: string, color?: string) {
    if (companyId) {
      this.assertCompany(companyId);
      return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
        const result = await queryRunner.query(
          `INSERT INTO roles (name, company_id, description, color) VALUES ($1, $2, $3, $4) RETURNING id, name, description, color, company_id`,
          [name, companyId, description || null, color || null],
        );
        return result[0];
      });
    }

    // Rol global: operación privilegiada, no pertenece a un tenant.
    const result = await this.dataSource.query(
      `INSERT INTO roles (name, company_id, description, color) VALUES ($1, $2, $3, $4) RETURNING id, name, description, color, company_id`,
      [name, null, description || null, color || null],
    );
    return result[0];
  }

  async updateName(id: string, name: string) {
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE roles SET name = $1 WHERE id = $2`,
        [name, id],
      );
    });
  }

  async update(id: string, data: { name?: string; description?: string; color?: string }) {
    const { updates, values, startIndex } = buildDynamicUpdate(
      data,
      ['name', 'description', 'color'],
      { nullEmptyStrings: ['description', 'color'] },
    );

    if (updates.length === 0) return;
    values.push(id);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = $${startIndex}`,
        values,
      );
    });
  }

  async delete(id: string) {
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const assignments = await queryRunner.query(
        `SELECT COUNT(*)::int AS total FROM membership_roles WHERE role_id = $1`,
        [id],
      );
      if (Number(assignments[0]?.total ?? 0) > 0) {
        throw new ConflictException(
          'El rol tiene miembros asignados. Reasígnalos antes de eliminarlo.',
        );
      }

      const placeholders = PROTECTED_ROLES.map((_, i) => `$${i + 2}`).join(', ');
      await queryRunner.query(
        `UPDATE roles SET deleted_at = NOW() WHERE id = $1 AND name NOT IN (${placeholders})`,
        [id, ...PROTECTED_ROLES],
      );
    });
  }

  async getPermissions(roleId: string) {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(
        `SELECT p.id, p.code, p.name, p.module
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.module, p.code`,
        [roleId],
      ),
    );
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      // Cambiar permisos invalida los claims de los miembros con este rol.
      await queryRunner.query(
        `UPDATE memberships m
         SET token_version = m.token_version + 1, updated_at = now()
         WHERE EXISTS (
           SELECT 1 FROM membership_roles mr
           WHERE mr.company_id = m.company_id
             AND mr.membership_id = m.id
             AND mr.role_id = $1
         )`,
        [roleId],
      );
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = $1`,
        [roleId],
      );
      if (permissionIds.length > 0) {
        const placeholders = permissionIds.map((_, i) => `$${i + 1}`).join(', ');
        const validRows = await queryRunner.query(
          `SELECT id FROM permissions WHERE id IN (${placeholders})`,
          permissionIds,
        );
        const validIds = validRows.map((r: any) => r.id);

        if (validIds.length > 0) {
          const values = validIds
            .map((pid: string, i: number) => `($1, $${i + 2})`)
            .join(', ');
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
            [roleId, ...validIds],
          );
        }
      }
    });
  }

  async getRolesWithPermissions(companyId: string) {
    // Siempre filtrado por empresa: roles globales (company_id IS NULL) +
    // roles de esa empresa. Nunca devuelve roles de otras empresas.
    this.assertCompany(companyId);
    const query = `
      SELECT r.id, r.name, r.company_id, r.description, r.color,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'module', p.module)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.deleted_at IS NULL
        AND (r.company_id IS NULL OR r.company_id = $1)
      GROUP BY r.id, r.name, r.company_id, r.description, r.color
      ORDER BY r.name
    `;
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(query, [companyId]),
    );
  }

  /**
   * Resuelve roles y permisos de un usuario en una empresa con una sola query.
   * Evita el N+1 de consultar memberships dos veces por cada tenant.
   */
  async getUserAccess(
    userId: string,
    companyId: string,
  ): Promise<{ roles: string[]; permissions: string[]; tokenVersion: number }> {
    const result = await this.dataSource.query(
      `SELECT
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.id IS NOT NULL), '{}'::text[]) AS roles,
         COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.id IS NOT NULL), '{}'::text[]) AS permissions,
         MAX(m.token_version)::int AS token_version
       FROM memberships m
       INNER JOIN membership_roles mr
         ON mr.membership_id = m.id AND mr.company_id = m.company_id
       INNER JOIN roles r ON r.id = mr.role_id AND r.deleted_at IS NULL
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE m.user_id = $1 AND m.company_id = $2 AND m.status = 'active'`,
      [userId, companyId],
    );

    return {
      roles: result[0]?.roles ?? [],
      permissions: result[0]?.permissions ?? [],
      tokenVersion: result[0]?.token_version ?? 0,
    };
  }
}
