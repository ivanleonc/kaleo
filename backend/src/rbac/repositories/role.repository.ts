import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PROTECTED_ROLES } from '../../common/constants/roles.js';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';

@Injectable()
export class RoleRepository {
  constructor(private dataSource: DataSource) {}

  async findAll(companyId?: string) {
    if (companyId) {
      return this.dataSource.query(
        `SELECT id, name, description, color, company_id FROM roles
         WHERE (company_id IS NULL OR company_id = $1) AND deleted_at IS NULL
         ORDER BY name`,
        [companyId],
      );
    }
    return this.dataSource.query(
      `SELECT id, name, description, color, company_id FROM roles WHERE deleted_at IS NULL ORDER BY name`,
    );
  }

  async findById(id: string) {
    const result = await this.dataSource.query(
      `SELECT id, name, description, color, company_id FROM roles WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result[0];
  }

  async findByName(name: string, companyId?: string) {
    if (companyId) {
      const result = await this.dataSource.query(
        `SELECT id, name, description, color, company_id FROM roles
         WHERE name = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL`,
        [name, companyId],
      );
      return result[0];
    }
    const result = await this.dataSource.query(
      `SELECT id, name, description, color, company_id FROM roles WHERE name = $1 AND deleted_at IS NULL`,
      [name],
    );
    return result[0];
  }

  async create(name: string, companyId?: string, description?: string, color?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO roles (name, company_id, description, color) VALUES ($1, $2, $3, $4) RETURNING id, name, description, color, company_id`,
      [name, companyId || null, description || null, color || null],
    );
    return result[0];
  }

  async updateName(id: string, name: string) {
    await this.dataSource.query(
      `UPDATE roles SET name = $1 WHERE id = $2`,
      [name, id],
    );
  }

  async update(id: string, data: { name?: string; description?: string; color?: string }) {
    const { updates, values, startIndex } = buildDynamicUpdate(
      data,
      ['name', 'description', 'color'],
      { nullEmptyStrings: ['description', 'color'] },
    );

    if (updates.length === 0) return;
    values.push(id);
    await this.dataSource.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = $${startIndex}`,
      values,
    );
  }

  async delete(id: string) {
    const placeholders = PROTECTED_ROLES.map((_, i) => `$${i + 2}`).join(', ');
    await this.dataSource.query(
      `UPDATE roles SET deleted_at = NOW() WHERE id = $1 AND name NOT IN (${placeholders})`,
      [id, ...PROTECTED_ROLES],
    );
  }

  async getPermissions(roleId: string) {
    return this.dataSource.query(
      `SELECT p.id, p.code, p.name, p.module
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.module, p.code`,
      [roleId],
    );
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getRolesWithPermissions(companyId?: string) {
    let query: string;
    let params: any[];

    if (companyId) {
      query = `
        SELECT r.id, r.name, r.company_id,
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
        GROUP BY r.id, r.name, r.company_id
        ORDER BY r.name
      `;
      params = [companyId];
    } else {
      query = `
        SELECT r.id, r.name, r.company_id,
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
        GROUP BY r.id, r.name, r.company_id
        ORDER BY r.name
      `;
      params = [];
    }

    return this.dataSource.query(query, params);
  }

  /**
   * Resuelve roles y permisos de un usuario en una empresa con una sola query.
   * Evita el N+1 de consultar `user_contexts` dos veces por cada tenant.
   */
  async getUserAccess(userId: string, companyId: string): Promise<{ roles: string[]; permissions: string[] }> {
    const result = await this.dataSource.query(
      `SELECT
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.id IS NOT NULL), '{}'::text[]) AS roles,
         COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.id IS NOT NULL), '{}'::text[]) AS permissions
       FROM user_contexts uc
       INNER JOIN roles r ON r.id = uc.role_id AND r.deleted_at IS NULL
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE uc.user_id = $1 AND uc.company_id = $2`,
      [userId, companyId],
    );

    return {
      roles: result[0]?.roles ?? [],
      permissions: result[0]?.permissions ?? [],
    };
  }
}
