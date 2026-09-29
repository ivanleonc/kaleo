import { Injectable, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';

@Injectable()
export class CompanyRepository {
  constructor(private dataSource: DataSource) {}

  // Adaptado al nuevo esquema usando user_contexts en lugar de company_users[cite: 13]
  async getUserCompanies(userId: string) {
    const query = `
      SELECT 
        c.id, c.name, c.tax_id, c.slug,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
      FROM companies c
      INNER JOIN user_contexts uc ON c.id = uc.company_id
      LEFT JOIN roles r ON uc.role_id = r.id
      WHERE uc.user_id = $1 AND c.is_active = TRUE AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.tax_id, c.slug
    `;
    const result = await this.dataSource.query(query, [userId]);
    return result; // En TypeORM el query directo ya retorna el arreglo de rows[cite: 13]
  }

  // Adaptado para usar transacciones puras en TypeORM
  async createWithOwner(userId: string, name: string, taxId?: string, slug?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insertamos la empresa[cite: 13]
      const companyResult = await queryRunner.query(
        `INSERT INTO companies (name, tax_id, slug) VALUES ($1, $2, $3) RETURNING *`,
        [name, taxId, slug ?? null]
      );
      const newCompany = companyResult[0];

      // 2. Buscamos o creamos el rol Owner para esta empresa (O usamos uno global)
      // Para este ejemplo, asumiremos que existe un rol global llamado 'Owner' 
      const roleResult = await queryRunner.query(`SELECT id FROM roles WHERE name = 'Owner' LIMIT 1`);
      
      let ownerRoleId;
      if (roleResult.length > 0) {
        ownerRoleId = roleResult[0].id;
      } else {
        // Si no existe, lo creamos globalmente
        const newRoleResult = await queryRunner.query(`INSERT INTO roles (name) VALUES ('Owner') RETURNING id`);
        ownerRoleId = newRoleResult[0].id;
      }

      // 3. Insertamos el contexto del usuario (Reemplaza a company_users y company_user_roles)[cite: 13]
      await queryRunner.query(
        `INSERT INTO user_contexts (user_id, company_id, branch_id, role_id) VALUES ($1, $2, NULL, $3)`,
        [userId, newCompany.id, ownerRoleId] // branch_id es NULL porque es acceso global[cite: 13]
      );

      await queryRunner.commitTransaction();
      return newCompany;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Ese identificador corto ya está en uso');
      }
      throw new InternalServerErrorException('Error creando la empresa');
    } finally {
      await queryRunner.release();
    }
  }

  // Verifica acceso y roles a través de user_contexts[cite: 13]
  async verifyUserBelongsToCompany(userId: string, companyId: string) {
    const result = await this.dataSource.query(
      `SELECT r.name as role_name
       FROM user_contexts uc
       JOIN roles r ON uc.role_id = r.id
       WHERE uc.user_id = $1 AND uc.company_id = $2`,
      [userId, companyId]
    );
    
    if (result.length === 0) return null;
    
    return { roles: result.map((row: any) => row.role_name) }; // Devolvemos nombres de roles para simplificar la validación[cite: 13]
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

    const query = `UPDATE companies SET ${updates.join(', ')} WHERE id = $${startIndex} RETURNING *`;
    const result = await this.dataSource.query(query, values);
    return result[0];
  }

  async findById(companyId: string) {
    const result = await this.dataSource.query(
      `SELECT id, name, tax_id, is_active, logo_url, phone, email, address,
              city, state, country, postal_code, timezone, slug,
              created_at, updated_at
       FROM companies WHERE id = $1 AND deleted_at IS NULL`,
      [companyId],
    );
    return result[0] || null;
  }

  async findBySlug(slug: string, excludeCompanyId?: string) {
    // No se filtra por deleted_at: el UNIQUE de companies.slug tampoco lo hace,
    // así el chequeo previo refleja exactamente lo que aceptará la base.
    const result = await this.dataSource.query(
      `SELECT id FROM companies
       WHERE slug = $1 AND ($2::uuid IS NULL OR id != $2)
       LIMIT 1`,
      [slug, excludeCompanyId || null],
    );
    return result[0] || null;
  }
}