import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { assertMember } from '../../common/utils/membership.helper.js';

@Injectable()
export class BranchRepository {
  constructor(private dataSource: DataSource) {}

  async findByCompany(companyId: string) {
    return this.dataSource.query(
      `SELECT b.id, b.company_id, b.name, b.address, b.city, b.state, b.country,
              b.postal_code, b.phone, b.email, b.is_active, b.code, b.is_main,
              b.timezone, b.created_at, b.updated_at,
              u.name as manager_name
       FROM branches b
       LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
       WHERE b.company_id = $1 AND b.deleted_at IS NULL
       ORDER BY b.name`,
      [companyId],
    );
  }

  async findById(branchId: string, companyId: string) {
    const result = await this.dataSource.query(
      `SELECT b.id, b.company_id, b.name, b.address, b.city, b.state, b.country,
              b.postal_code, b.phone, b.email, b.is_active, b.code, b.is_main,
              b.timezone, b.manager_user_id, b.created_at, b.updated_at,
              u.name as manager_name
       FROM branches b
       LEFT JOIN users u ON u.id = b.manager_user_id AND u.deleted_at IS NULL
       WHERE b.id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL`,
      [branchId, companyId],
    );
    return result[0] || null;
  }

  async create(companyId: string, data: {
    name: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string;
    code?: string; manager_user_id?: string; timezone?: string;
  }) {
    if (data.manager_user_id) {
      await this.assertUserInCompany(data.manager_user_id, companyId);
    }
    const result = await this.dataSource.query(
      `INSERT INTO branches (company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone, is_main, is_active, created_at, updated_at`,
      [companyId, data.name, data.address || null, data.city || null, data.state || null,
       data.country || null, data.postal_code || null, data.phone || null, data.email || null,
       data.code || null, data.manager_user_id || null, data.timezone || null],
    );
    return result[0];
  }

  async update(branchId: string, companyId: string, data: {
    name?: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string; is_active?: boolean;
    code?: string; is_main?: boolean; manager_user_id?: string; timezone?: string;
  }) {
    if (data.manager_user_id) {
      await this.assertUserInCompany(data.manager_user_id, companyId);
    }
    if (data.is_main === true) {
      await this.dataSource.query(
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

    if (updates.length === 0) return this.findById(branchId, companyId);

    values.push(branchId, companyId);
    const result = await this.dataSource.query(
      `UPDATE branches SET ${updates.join(', ')}
       WHERE id = $${startIndex} AND company_id = $${startIndex + 1} AND deleted_at IS NULL
       RETURNING id, company_id, name, address, city, state, country, postal_code, phone, email, code, manager_user_id, timezone, is_main, is_active, created_at, updated_at`,
      values,
    );
    return result[0] || null;
  }

  private async assertUserInCompany(userId: string, companyId: string) {
    await assertMember(
      (sql, params) => this.dataSource.query(sql, params),
      userId,
      companyId,
      'El responsable debe ser miembro de la empresa',
    );
  }

  async softDelete(branchId: string, companyId: string) {
    const existing = await this.findById(branchId, companyId);
    if (!existing) {
      throw new NotFoundException('Sede no encontrada');
    }

    const memberCount = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM user_contexts WHERE branch_id = $1`,
      [branchId],
    );

    if (parseInt(memberCount[0].count) > 0) {
      throw new ConflictException('No se puede eliminar una sede que tiene miembros asignados. Reasigna los miembros primero.');
    }

    await this.dataSource.query(
      `UPDATE branches SET deleted_at = NOW() WHERE id = $1 AND company_id = $2`,
      [branchId, companyId],
    );
    return { message: 'Sede eliminada correctamente' };
  }
}
