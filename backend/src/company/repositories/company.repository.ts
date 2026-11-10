import { Injectable, InternalServerErrorException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { runInTransaction } from '../../common/utils/transaction.helper.js';
import { rows, row } from '../../common/utils/db.js';
import { upsertMembershipWithRoles } from '../../common/utils/membership.helper.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import type { CompanyRow, TenantRow, IdRow, RoleNameRow } from '../../common/types/db-rows.js';

@Injectable()
export class CompanyRepository {
  constructor(
    private dataSource: DataSource,
    private tenantContext: TenantContextService,
    @Optional() @InjectDataSource('auth') private authDataSource?: DataSource,
  ) {}

  private get privilegedDataSource(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async getUserCompanies(userId: string): Promise<TenantRow[]> {
    const sql = `
      SELECT 
        c.id, c.name, c.tax_id, c.slug,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
      FROM companies c
      INNER JOIN memberships m
        ON c.id = m.company_id AND m.user_id = $1 AND m.status = 'active'
      LEFT JOIN membership_roles mr
        ON mr.membership_id = m.id AND mr.company_id = m.company_id
      LEFT JOIN roles r ON mr.role_id = r.id
      WHERE c.is_active = TRUE AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.tax_id, c.slug
    `;
    return rows<TenantRow>(await this.privilegedDataSource.query(sql, [userId]));
  }

  async createWithOwner(
    userId: string,
    name: string,
    taxId?: string,
    slug?: string,
    onCreated?: (queryRunner: QueryRunner, company: CompanyRow) => Promise<void>,
  ) {
    let newCompany: CompanyRow | undefined;
    try {
      await runInTransaction(this.privilegedDataSource, async (queryRunner) => {
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

        await upsertMembershipWithRoles(queryRunner, userId, newCompany!.id, [ownerRoleId]);

        if (onCreated) {
          await onCreated(queryRunner, newCompany!);
        }
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
    const result = rows<RoleNameRow>(await this.privilegedDataSource.query(
      `SELECT r.name as role_name
       FROM memberships m
       INNER JOIN membership_roles mr
         ON mr.membership_id = m.id AND mr.company_id = m.company_id
       INNER JOIN roles r ON mr.role_id = r.id
       WHERE m.user_id = $1 AND m.company_id = $2 AND m.status = 'active'`,
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

    this.assertCompany(companyId);
    const sql = `UPDATE companies SET ${updates.join(', ')} WHERE id = $${startIndex} RETURNING *`;
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      row<CompanyRow>(await queryRunner.query(sql, values)) ?? null,
    );
  }

  async findById(companyId: string): Promise<CompanyRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      row<CompanyRow>(await queryRunner.query(
        `SELECT id, name, tax_id, is_active, logo_url, phone, email, address,
                city, state, country, postal_code, timezone, slug,
                created_at, updated_at
         FROM companies WHERE id = $1 AND deleted_at IS NULL`,
        [companyId],
      )) ?? null,
    );
  }

  async findBySlug(slug: string, excludeCompanyId?: string): Promise<IdRow | null> {
    // Chequeo de unicidad global entre empresas activas: debe ver empresas de
    // otros tenants, por eso se mantiene en el camino privilegiado (también se
    // usa en onboarding, antes de que exista TenantContext).
    return row<IdRow>(await this.privilegedDataSource.query(
      `SELECT id FROM companies
       WHERE slug = $1 AND deleted_at IS NULL
         AND ($2::uuid IS NULL OR id != $2)
       LIMIT 1`,
      [slug, excludeCompanyId || null],
    )) ?? null;
  }

  async getAllCompanies(): Promise<CompanyRow[]> {
    return rows<CompanyRow>(await this.privilegedDataSource.query(
      `SELECT c.id, c.name, c.tax_id, c.slug, c.is_active,
              COUNT(DISTINCT m.user_id)::int AS member_count
       FROM companies c
       LEFT JOIN memberships m ON m.company_id = c.id AND m.status = 'active'
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, c.name, c.tax_id, c.slug, c.is_active
       ORDER BY c.name`,
    ));
  }
}