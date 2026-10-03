import { Injectable, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { runInTransaction } from '../../common/utils/transaction.helper.js';
import { rows, row } from '../../common/utils/db.js';
import type { CompanyRow, TenantRow, IdRow, RoleNameRow } from '../../common/types/db-rows.js';

@Injectable()
export class CompanyRepository {
  constructor(private dataSource: DataSource) {}

  async getUserCompanies(userId: string): Promise<TenantRow[]> {
    const sql = `
      SELECT 
        c.id, c.name, c.tax_id, c.slug,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
      FROM companies c
      INNER JOIN user_contexts uc ON c.id = uc.company_id
      LEFT JOIN roles r ON uc.role_id = r.id
      WHERE uc.user_id = $1 AND c.is_active = TRUE AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.tax_id, c.slug
    `;
    return rows<TenantRow>(await this.dataSource.query(sql, [userId]));
  }

  async createWithOwner(userId: string, name: string, taxId?: string, slug?: string) {
    let newCompany: CompanyRow | undefined;
    try {
      await runInTransaction(this.dataSource, async (queryRunner) => {
        const companyResult = rows<CompanyRow>(await queryRunner.query(
          `INSERT INTO companies (name, tax_id, slug) VALUES ($1, $2, $3) RETURNING *`,
          [name, taxId, slug ?? null],
        ));
        newCompany = companyResult[0];

        const roleResult = rows<IdRow>(await queryRunner.query(
          `SELECT id FROM roles WHERE name = 'Owner' LIMIT 1`,
        ));

        let ownerRoleId: string;
        if (roleResult.length > 0) {
          ownerRoleId = roleResult[0]!.id;
        } else {
          const newRoleResult = rows<IdRow>(await queryRunner.query(
            `INSERT INTO roles (name) VALUES ('Owner') RETURNING id`,
          ));
          ownerRoleId = newRoleResult[0]!.id;
        }

        await queryRunner.query(
          `INSERT INTO user_contexts (user_id, company_id, branch_id, role_id) VALUES ($1, $2, NULL, $3)`,
          [userId, newCompany!.id, ownerRoleId],
        );
      });
      return newCompany;
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Ese identificador corto ya está en uso');
      }
      throw new InternalServerErrorException('Error creando la empresa');
    }
  }

  async verifyUserBelongsToCompany(userId: string, companyId: string) {
    const result = rows<RoleNameRow>(await this.dataSource.query(
      `SELECT r.name as role_name
       FROM user_contexts uc
       JOIN roles r ON uc.role_id = r.id
       WHERE uc.user_id = $1 AND uc.company_id = $2`,
      [userId, companyId],
    ));

    if (result.length === 0) return null;

    return { roles: result.map((r) => r.role_name) };
  }

  async update(companyId: string, data: {
    name?: string; tax_id?: string; logo_url?: string; phone?: string; email?: string;
    address?: string; city?: string; state?: string; country?: string;
    postal_code?: string; timezone?: string; slug?: string;
  }) {
    const { updates, values, startIndex } = buildDynamicUpdate(
      data,
      ['name', 'tax_id', 'logo_url', 'phone', 'email', 'address', 'city', 'state', 'country', 'postal_code', 'timezone', 'slug'],
      { nullEmptyStrings: ['tax_id', 'logo_url', 'phone', 'email', 'address', 'city', 'state', 'country', 'postal_code', 'timezone', 'slug'] },
    );

    if (updates.length === 0) return null;
    values.push(companyId);

    const sql = `UPDATE companies SET ${updates.join(', ')} WHERE id = $${startIndex} RETURNING *`;
    return row<CompanyRow>(await this.dataSource.query(sql, values)) ?? null;
  }

  async findById(companyId: string): Promise<CompanyRow | null> {
    return row<CompanyRow>(await this.dataSource.query(
      `SELECT id, name, tax_id, is_active, logo_url, phone, email, address,
              city, state, country, postal_code, timezone, slug,
              created_at, updated_at
       FROM companies WHERE id = $1 AND deleted_at IS NULL`,
      [companyId],
    )) ?? null;
  }

  async findBySlug(slug: string, excludeCompanyId?: string): Promise<IdRow | null> {
    return row<IdRow>(await this.dataSource.query(
      `SELECT id FROM companies
       WHERE slug = $1 AND ($2::uuid IS NULL OR id != $2)
       LIMIT 1`,
      [slug, excludeCompanyId || null],
    )) ?? null;
  }

  async getAllCompanies(): Promise<CompanyRow[]> {
    return rows<CompanyRow>(await this.dataSource.query(
      `SELECT c.id, c.name, c.tax_id, c.slug, c.is_active,
              COUNT(DISTINCT uc.user_id)::int AS member_count
       FROM companies c
       LEFT JOIN user_contexts uc ON uc.company_id = c.id
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, c.name, c.tax_id, c.slug, c.is_active
       ORDER BY c.name`,
    ));
  }
}