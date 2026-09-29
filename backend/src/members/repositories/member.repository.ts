import { Injectable, NotFoundException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate, buildWhere } from '../../common/utils/sql.helper.js';
import { assertMember, insertUserContexts } from '../../common/utils/membership.helper.js';

@Injectable()
export class MemberRepository {
  constructor(private dataSource: DataSource) {}

  async getMembersByCompany(
    companyId: string,
    page = 1,
    limit = 50,
    filters: { search?: string; status?: string; roleId?: string } = {},
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
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
       ORDER BY u.name, u.email
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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
          await queryRunner.rollbackTransaction();
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

      await queryRunner.commitTransaction();

      return {
        id: userId,
        name,
        email,
        role_assigned: finalRoleIds[0],
        isNewUser: !userAlreadyExisted,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al agregar el miembro');
    } finally {
      await queryRunner.release();
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

      await queryRunner.commitTransaction();
      return { message: 'Miembro actualizado correctamente' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al actualizar el miembro');
    } finally {
      await queryRunner.release();
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

  async removeMember(companyId: string, userId: string) {
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
