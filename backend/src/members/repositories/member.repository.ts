import { Injectable, NotFoundException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { buildDynamicUpdate, buildWhere } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
import { EXPORT_MAX_ROWS } from '../../common/export/export.types.js';
import { assertMember, insertUserContexts } from '../../common/utils/membership.helper.js';
import { runInTransaction } from '../../common/utils/transaction.helper.js';

/** Orden server-side: solo estas claves son válidas; `status` ordena por bloqueo. */
const MEMBER_SORT_COLUMNS: Record<string, string> = {
  name: 'u.name',
  email: 'u.email',
  created_at: 'u.created_at',
  status: `CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END`,
};

@Injectable()
export class MemberRepository {
  constructor(private dataSource: DataSource) {}

  async getMembersByCompany(
    companyId: string,
    page = 1,
    limit = 50,
    filters: { search?: string; status?: string; roleId?: string } = {},
    sort: SortSpec = {},
  ) {
    const safePage = Math.max(1, page);
    // Mismo tope que el DTO (@Max(100)): defensa en profundidad si el
    // repositorio se llama directo sin pasar por la validación del DTO.
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'm.company_id = $?', value: companyId },
        { clause: 'u.deleted_at IS NULL' },
        filters.search
          ? { clause: '(u.name ILIKE $? OR u.email ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.status === 'inactive'
          ? { clause: 'u.locked_until IS NOT NULL AND u.locked_until > NOW()' }
          : filters.status === 'active'
            ? { clause: '(u.locked_until IS NULL OR u.locked_until <= NOW())' }
            : undefined,
        filters.roleId ? { clause: 'EXISTS (SELECT 1 FROM membership_roles mr2 WHERE mr2.membership_id = m.id AND mr2.company_id = m.company_id AND mr2.role_id = $?)', value: filters.roleId } : undefined,
      ],
      1,
    );

    const statusExpr = `CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END`;

    const orderBy = buildOrderBy(MEMBER_SORT_COLUMNS, sort, 'name');

    const countResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
       WHERE ${where}`,
      values,
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    const data = await this.dataSource.query(
      `SELECT
         u.id, u.email, u.name, u.created_at,
         u.phone, u.position, u.avatar_url,
         u.document_type, u.document_number,
         u.must_change_password,
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
         ${statusExpr} as status
       FROM users u
       INNER JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
       LEFT JOIN membership_roles mr
         ON mr.membership_id = m.id AND mr.company_id = m.company_id
       LEFT JOIN roles r ON mr.role_id = r.id
       WHERE ${where}
       GROUP BY u.id, u.email, u.name, u.created_at, u.locked_until,
                u.phone, u.position, u.avatar_url,
                u.document_type, u.document_number,
                u.must_change_password
       ORDER BY ${orderBy}, u.name, u.email
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      [...values, safeLimit, offset],
    );

    return { data, total, page: safePage, limit: safeLimit };
  }

  /**
   * Misma consulta que `getMembersByCompany`, sin paginación y con un tope
   * duro de filas para exportación. Se pide una fila extra para que el
   * servicio pueda detectar que el resultado supera el límite.
   */
  async findForExport(
    companyId: string,
    filters: { search?: string; status?: string; roleId?: string } = {},
    sort: SortSpec = {},
  ) {
    const { where, values, nextIndex } = buildWhere(
      [
        { clause: 'm.company_id = $?', value: companyId },
        { clause: 'u.deleted_at IS NULL' },
        filters.search
          ? { clause: '(u.name ILIKE $? OR u.email ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.status === 'inactive'
          ? { clause: 'u.locked_until IS NOT NULL AND u.locked_until > NOW()' }
          : filters.status === 'active'
            ? { clause: '(u.locked_until IS NULL OR u.locked_until <= NOW())' }
            : undefined,
        filters.roleId ? { clause: 'EXISTS (SELECT 1 FROM membership_roles mr2 WHERE mr2.membership_id = m.id AND mr2.company_id = m.company_id AND mr2.role_id = $?)', value: filters.roleId } : undefined,
      ],
      1,
    );

    const statusExpr = `CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END`;
    const orderBy = buildOrderBy(MEMBER_SORT_COLUMNS, sort, 'name');

    return this.dataSource.query(
      `SELECT
         u.id, u.email, u.name,
         COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
         ${statusExpr} as status
       FROM users u
       INNER JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
       LEFT JOIN membership_roles mr
         ON mr.membership_id = m.id AND mr.company_id = m.company_id
       LEFT JOIN roles r ON mr.role_id = r.id
       WHERE ${where}
       GROUP BY u.id, u.email, u.name, u.locked_until
       ORDER BY ${orderBy}, u.name, u.email
       LIMIT $${nextIndex}`,
      [...values, EXPORT_MAX_ROWS + 1],
    );
  }

  async isAlreadyMember(userId: string, companyId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM memberships
       WHERE user_id = $1 AND company_id = $2 AND status = 'active'`,
      [userId, companyId],
    );
    return result.length > 0;
  }

  async addMember(
    companyId: string,
    email: string,
    name: string,
    roleIds: string[],
    passwordHash: string,
    extra?: { phone?: string; position?: string; document_type?: string; document_number?: string },
  ) {
    let result: any;
    try {
      await runInTransaction(this.dataSource, async (queryRunner) => {
        let userResult = await queryRunner.query(
          `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
          [email],
        );

        let userId: string;
        let userAlreadyExisted = false;

        if (userResult.length > 0) {
          userId = userResult[0].id;
          userAlreadyExisted = true;
          const memberCheck = await queryRunner.query(
            `SELECT 1 FROM memberships
             WHERE user_id = $1 AND company_id = $2 AND status = 'active'`,
            [userId, companyId],
          );
          if (memberCheck.length > 0) {
            throw new ConflictException('El usuario ya es miembro de esta empresa');
          }
        } else {
          const newUser = await queryRunner.query(
            `INSERT INTO users (email, password_hash, name, must_change_password, phone, position, document_type, document_number)
             VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7)
             RETURNING id`,
            [
              email,
              passwordHash,
              name,
              extra?.phone || null,
              extra?.position || null,
              extra?.document_type || null,
              extra?.document_number || null,
            ],
          );
          userId = newUser[0].id;
        }

        let finalRoleIds = roleIds;
        if (!finalRoleIds || finalRoleIds.length === 0) {
          const defaultRole = await queryRunner.query(
            `SELECT id FROM roles WHERE name = 'Admin' AND company_id IS NULL LIMIT 1`,
          );
          finalRoleIds = defaultRole.length > 0 ? [defaultRole[0].id] : [];
        }

        await insertUserContexts(queryRunner, userId, companyId, finalRoleIds);

        result = {
          id: userId,
          name,
          email,
          role_assigned: finalRoleIds[0],
          isNewUser: !userAlreadyExisted,
        };
      });
      return result;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al agregar el miembro');
    }
  }

  async updateMember(
    companyId: string,
    userId: string,
    data: {
      roleIds?: string[];
      status?: string;
      phone?: string;
      position?: string;
      document_type?: string;
      document_number?: string;
    },
  ) {
    try {
      await runInTransaction(this.dataSource, async (queryRunner) => {
        await assertMember(
          (sql, params) => queryRunner.query(sql, params),
          userId,
          companyId,
        );

        if (data.roleIds && data.roleIds.length > 0) {
          await queryRunner.query(
            `DELETE FROM membership_roles
             WHERE company_id = $1
               AND membership_id = (
                 SELECT id FROM memberships
                 WHERE company_id = $1 AND user_id = $2
               )`,
            [companyId, userId],
          );

          await queryRunner.query(
            `DELETE FROM user_contexts WHERE user_id = $1 AND company_id = $2`,
            [userId, companyId],
          );

          await insertUserContexts(queryRunner, userId, companyId, data.roleIds);
        }

        if (data.status) {
          if (data.status === 'inactive') {
            await queryRunner.query(
              `UPDATE users SET locked_until = NOW() + interval '100 years' WHERE id = $1`,
              [userId],
            );
          } else {
            await queryRunner.query(
              `UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1`,
              [userId],
            );
          }
        }

        const { updates: profileUpdates, values: profileValues, startIndex: profileIndex } =
          buildDynamicUpdate(
            data,
            ['phone', 'position', 'document_type', 'document_number'],
            { nullEmptyStrings: true },
          );
        if (profileUpdates.length > 0) {
          profileValues.push(userId);
          await queryRunner.query(
            `UPDATE users SET ${profileUpdates.join(', ')} WHERE id = $${profileIndex}`,
            profileValues,
          );
        }
      });
      return { message: 'Miembro actualizado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al actualizar el miembro');
    }
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.dataSource.query(
      `UPDATE users SET password_hash = $1, must_change_password = TRUE, password_changed_at = NOW() WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async findUserById(userId: string) {
    const result = await this.dataSource.query(
      `SELECT id, email, name FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    return result[0];
  }

  async findUserByEmail(email: string) {
    const result = await this.dataSource.query(
      `SELECT id, email, name FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result[0];
  }

  /**
   * Valida que todos los roleIds existan y pertenezcan a la empresa destino
   * (o sean globales con company_id IS NULL). Devuelve los inválidos.
   */
  async findInvalidRoleIds(roleIds: string[], companyId: string): Promise<string[]> {
    if (!roleIds || roleIds.length === 0) return [];
    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.dataSource.query(
      `SELECT id FROM roles
       WHERE id IN (${placeholders})
         AND (company_id IS NULL OR company_id = $${roleIds.length + 1})
         AND deleted_at IS NULL`,
      [...roleIds, companyId],
    );
    const valid = new Set(rows.map((r: any) => r.id));
    return roleIds.filter((id) => !valid.has(id));
  }

  /**
   * Resuelve nombres de rol a IDs dentro de una empresa (globales incluidos).
   * Devuelve los nombres que NO se pudieron resolver.
   */
  async resolveRoleIdsByName(names: string[], companyId: string): Promise<{ ids: string[]; missing: string[] }> {
    const unique: string[] = [...new Set(names.filter((n): n is string => !!n))];
    if (unique.length === 0) return { ids: [], missing: [] };
    const placeholders = unique.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.dataSource.query(
      `SELECT id, name FROM roles
       WHERE name IN (${placeholders})
         AND (company_id IS NULL OR company_id = $${unique.length + 1})
         AND deleted_at IS NULL`,
      [...unique, companyId],
    );
    const found = new Map<string, string>(rows.map((r: any) => [r.name, r.id] as [string, string]));
    return {
      ids: unique.filter((n) => found.has(n)).map((n) => found.get(n) as string),
      missing: unique.filter((n) => !found.has(n)),
    };
  }
  /**
   * Vincula un usuario EXISTENTE a una empresa (sin tocar su contraseña
   * ni enviarle correos: su acceso actual no cambia).
   */
  async attachExistingUser(companyId: string, userId: string, roleIds: string[]) {
    let result: any;
    try {
      await runInTransaction(this.dataSource, async (queryRunner) => {
        const memberCheck = await queryRunner.query(
          `SELECT 1 FROM memberships
           WHERE user_id = $1 AND company_id = $2 AND status = 'active'`,
          [userId, companyId],
        );
        if (memberCheck.length > 0) {
          throw new ConflictException('El usuario ya es miembro de esta empresa');
        }
        await insertUserContexts(queryRunner, userId, companyId, roleIds);
        result = { id: userId, roleIds, isNewUser: false };
      });
      return result;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al asignar la empresa al miembro');
    }
  }

  /**
   * Empresas (con roles) a las que pertenece un usuario.
   * A diferencia de getUserCompanies —que filtra por miembro activo— esta
   * versión es para administración (detalle del miembro).
   */
  async getMemberCompanies(userId: string) {
    const result = await this.dataSource.query(
      `SELECT c.id, c.name, c.slug,
              COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM companies c
       INNER JOIN memberships m
         ON m.company_id = c.id AND m.user_id = $1 AND m.status = 'active'
       LEFT JOIN membership_roles mr
         ON mr.membership_id = m.id AND mr.company_id = m.company_id
       LEFT JOIN roles r ON r.id = mr.role_id
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, c.name, c.slug
       ORDER BY c.name`,
      [userId],
    );
    return result;
  }

  /**
   * Búsqueda de usuarios para autocompletar (flujo de asignación).
   * Solo devuelve usuarios que ya pertenecen a la empresa: cerrar la fuga
   * cross-tenant P0-1. El alta de usuarios nuevos va por invitación.
   * Solo id/nombre/email: nunca hashes, roles ni tokens.
   */
  async searchUsers(companyId: string, query: string, limit = 10) {
    const result = await this.dataSource.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       WHERE u.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM memberships m
           WHERE m.user_id = u.id AND m.company_id = $1 AND m.status = 'active'
         )
         AND (u.name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u.name
       LIMIT $3`,
      [companyId, `%${query}%`, Math.min(Math.max(limit, 1), 20)],
    );
    return result;
  }

  async removeMember(
    companyId: string,
    userId: string,
    onRemoved?: (
      queryRunner: QueryRunner,
      removed: { id: string; email: string; name: string | null },
    ) => Promise<void>,
  ) {
    await runInTransaction(this.dataSource, async (queryRunner) => {
      const userRows = await queryRunner.query(
        `SELECT id, email, name FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId],
      );
      if (userRows.length === 0) {
        throw new NotFoundException('El usuario no es miembro de esta empresa');
      }

      // Impedir dejar la empresa sin ningún Owner: si este usuario es el
      // único Owner activo el borrado se rechaza.
      const ownerCheck = await queryRunner.query(
        `SELECT COUNT(*) AS total
         FROM memberships m
         INNER JOIN membership_roles mr
           ON mr.membership_id = m.id AND mr.company_id = m.company_id
         INNER JOIN roles r ON r.id = mr.role_id AND r.deleted_at IS NULL
         WHERE m.company_id = $1
           AND m.status = 'active'
           AND r.name = 'Owner'
           AND m.user_id != $2`,
        [companyId, userId],
      );
      const otherOwners = parseInt(ownerCheck[0]?.total ?? '0', 10);

      const isOwner = await queryRunner.query(
        `SELECT 1
         FROM memberships m
         INNER JOIN membership_roles mr
           ON mr.membership_id = m.id AND mr.company_id = m.company_id
         INNER JOIN roles r ON r.id = mr.role_id AND r.deleted_at IS NULL
         WHERE m.user_id = $1
           AND m.company_id = $2
           AND m.status = 'active'
           AND r.name = 'Owner'`,
        [userId, companyId],
      );

      if (isOwner.length > 0 && otherOwners === 0) {
        throw new ConflictException(
          'No puedes eliminar al único Owner de la empresa. Asigna otro Owner primero.',
        );
      }

      const deleted = await queryRunner.query(
        `DELETE FROM user_contexts
         WHERE user_id = $1 AND company_id = $2
         RETURNING id`,
        [userId, companyId],
      );
      if (deleted.length === 0) {
        throw new NotFoundException('El usuario no es miembro de esta empresa');
      }

      await queryRunner.query(
        `DELETE FROM memberships WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId],
      );

      if (onRemoved) {
        await onRemoved(queryRunner, userRows[0]);
      }
    });

    return { message: 'Miembro eliminado de la empresa correctamente' };
  }
}
