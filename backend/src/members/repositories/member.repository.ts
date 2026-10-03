import { Injectable, NotFoundException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate, buildWhere } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
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
        { clause: 'uc.company_id = $?', value: companyId },
        { clause: 'u.deleted_at IS NULL' },
        filters.search
          ? { clause: '(u.name ILIKE $? OR u.email ILIKE $?)', value: `%${filters.search}%`, reuse: true }
          : undefined,
        filters.status === 'inactive'
          ? { clause: 'u.locked_until IS NOT NULL AND u.locked_until > NOW()' }
          : filters.status === 'active'
            ? { clause: '(u.locked_until IS NULL OR u.locked_until <= NOW())' }
            : undefined,
        filters.roleId ? { clause: 'EXISTS (SELECT 1 FROM user_contexts ucr WHERE ucr.user_id = u.id AND ucr.company_id = uc.company_id AND ucr.role_id = $?)', value: filters.roleId } : undefined,
      ],
      1,
    );

    const statusExpr = `CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END`;

    const orderBy = buildOrderBy(MEMBER_SORT_COLUMNS, sort, 'name');

    const countResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN user_contexts uc ON u.id = uc.user_id
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
       INNER JOIN user_contexts uc ON u.id = uc.user_id
       LEFT JOIN roles r ON uc.role_id = r.id
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

  async isAlreadyMember(userId: string, companyId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM user_contexts WHERE user_id = $1 AND company_id = $2`,
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
            `SELECT 1 FROM user_contexts WHERE user_id = $1 AND company_id = $2`,
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
          `SELECT 1 FROM user_contexts WHERE user_id = $1 AND company_id = $2`,
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
       INNER JOIN user_contexts uc ON uc.company_id = c.id
       LEFT JOIN roles r ON r.id = uc.role_id
       WHERE uc.user_id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id, c.name, c.slug
       ORDER BY c.name`,
      [userId],
    );
    return result;
  }

  /**
   * Búsqueda de usuarios para autocompletar (flujo de asignación).
   * Solo id/nombre/email: nunca hashes, roles ni tokens.
   */
  async searchUsers(query: string, limit = 10) {
    const result = await this.dataSource.query(
      `SELECT id, name, email FROM users
       WHERE deleted_at IS NULL
         AND (name ILIKE $1 OR email ILIKE $1)
       ORDER BY name
       LIMIT $2`,
      [`%${query}%`, Math.min(Math.max(limit, 1), 20)],
    );
    return result;
  }

  async removeMember(companyId: string, userId: string) {
    // Impedir dejar la empresa sin ningún Owner: si este usuario es el
    // único Owner activo el borrado se rechaza.
    const ownerCheck = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM user_contexts uc
       INNER JOIN roles r ON r.id = uc.role_id AND r.deleted_at IS NULL
       WHERE uc.company_id = $1
         AND r.name = 'Owner'
         AND uc.user_id != $2`,
      [companyId, userId],
    );
    const otherOwners = parseInt(ownerCheck[0]?.total ?? '0', 10);

    // Verificar si el usuario a eliminar es Owner
    const isOwner = await this.dataSource.query(
      `SELECT 1 FROM user_contexts uc
       INNER JOIN roles r ON r.id = uc.role_id AND r.deleted_at IS NULL
       WHERE uc.user_id = $1 AND uc.company_id = $2 AND r.name = 'Owner'`,
      [userId, companyId],
    );

    if (isOwner.length > 0 && otherOwners === 0) {
      throw new ConflictException(
        'No puedes eliminar al único Owner de la empresa. Asigna otro Owner primero.',
      );
    }

    const result = await this.dataSource.query(
      `DELETE FROM user_contexts WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('El usuario no es miembro de esta empresa');
    }

    return { message: 'Miembro eliminado de la empresa correctamente' };
  }
}
