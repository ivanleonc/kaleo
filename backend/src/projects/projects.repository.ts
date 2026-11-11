import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectListFilters,
  ProjectMemberRow,
  ProjectRole,
  ProjectRow,
} from './projects.types.js';

@Injectable()
export class ProjectsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async list(
    companyId: string,
    filters: ProjectListFilters,
  ): Promise<{ data: ProjectRow[]; total: number }> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['p.company_id = $1', 'p.deleted_at IS NULL'];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(
          `(p.code ILIKE $${values.length} OR p.name ILIKE $${values.length}
            OR COALESCE(p.description, '') ILIKE $${values.length}
            OR COALESCE(party.name, '') ILIKE $${values.length})`,
        );
      }
      if (filters.status) {
        values.push(filters.status);
        where.push(`p.status = $${values.length}`);
      }
      if (filters.branchId) {
        values.push(filters.branchId);
        where.push(`p.branch_id = $${values.length}`);
      }
      if (filters.clientPartyId) {
        values.push(filters.clientPartyId);
        where.push(`p.client_party_id = $${values.length}`);
      }
      const whereSql = where.join(' AND ');
      const count = (await queryRunner.query(
        `SELECT COUNT(*)::int AS total
         FROM projects p
         LEFT JOIN parties party ON party.id = p.client_party_id AND party.company_id = p.company_id
         WHERE ${whereSql}`,
        values,
      )) as Array<{ total: number }>;

      const page = Math.max(filters.page, 1);
      const limit = Math.min(Math.max(filters.limit, 1), 100);
      values.push(limit, (page - 1) * limit);
      const rows = (await queryRunner.query(
        `SELECT p.*, b.name AS branch_name, party.name AS client_name,
                (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id)
                  AS members_count
         FROM projects p
         LEFT JOIN branches b ON b.id = p.branch_id AND b.company_id = p.company_id
         LEFT JOIN parties party ON party.id = p.client_party_id AND party.company_id = p.company_id
         WHERE ${whereSql}
         ORDER BY p.created_at DESC, p.name
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      )) as ProjectRow[];
      return { data: rows, total: count[0]?.total ?? 0 };
    });
  }

  async findById(companyId: string, id: string): Promise<ProjectDetail | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT p.*, b.name AS branch_name, party.name AS client_name,
                (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id)
                  AS members_count
         FROM projects p
         LEFT JOIN branches b ON b.id = p.branch_id AND b.company_id = p.company_id
         LEFT JOIN parties party ON party.id = p.client_party_id AND party.company_id = p.company_id
         WHERE p.id = $1 AND p.company_id = $2 AND p.deleted_at IS NULL`,
        [id, companyId],
      )) as ProjectRow[];
      if (!rows[0]) return null;

      const members = await this.listMembersWithRunner(queryRunner, companyId, id);
      return { ...rows[0], members };
    });
  }

  async findCode(companyId: string, code: string): Promise<string | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM projects
         WHERE company_id = $1 AND lower(code) = lower($2) AND deleted_at IS NULL
         LIMIT 1`,
        [companyId, code],
      )) as Array<{ id: string }>;
      return rows[0]?.id ?? null;
    });
  }

  async create(
    companyId: string,
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectDetail> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const rows = (await queryRunner.query(
          `INSERT INTO projects
             (company_id, branch_id, client_party_id, code, name, description,
              status, currency_code, start_date, end_date, timezone, address,
              created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
           RETURNING id`,
          [
            companyId,
            input.branchId ?? null,
            input.clientPartyId ?? null,
            input.code,
            input.name,
            input.description ?? null,
            input.status ?? 'draft',
            input.currencyCode,
            input.startDate ?? null,
            input.endDate ?? null,
            input.timezone ?? null,
            input.address ?? null,
            userId,
          ],
        )) as Array<{ id: string }>;
        return rows[0]!.id;
      },
    );
    const project = await this.findById(companyId, id);
    return project!;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    input: Partial<CreateProjectInput>,
  ): Promise<ProjectDetail | null> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          branch_id: input.branchId,
          client_party_id: input.clientPartyId,
          code: input.code,
          name: input.name,
          description: input.description,
          status: input.status,
          currency_code: input.currencyCode,
          start_date: input.startDate,
          end_date: input.endDate,
          timezone: input.timezone,
          address: input.address,
          updated_by: userId,
        },
        [
          'branch_id',
          'client_party_id',
          'code',
          'name',
          'description',
          'status',
          'currency_code',
          'start_date',
          'end_date',
          'timezone',
          'address',
          'updated_by',
        ],
        {
          nullEmptyStrings: [
            'branch_id',
            'client_party_id',
            'description',
            'start_date',
            'end_date',
            'timezone',
            'address',
          ],
          extraSet: ['updated_at = now()'],
        },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE projects
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL`,
        values,
      );
    });
    return this.findById(companyId, id);
  }

  async softDelete(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE projects SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listMembers(companyId: string, projectId: string): Promise<ProjectMemberRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return this.listMembersWithRunner(queryRunner, companyId, projectId);
    });
  }

  private async listMembersWithRunner(
    queryRunner: { query(sql: string, parameters?: any[]): Promise<any> },
    companyId: string,
    projectId: string,
  ): Promise<ProjectMemberRow[]> {
    return (await queryRunner.query(
      `SELECT pm.*, u.id AS user_id, u.name AS user_name, u.email AS user_email,
              m.status AS membership_status
       FROM project_members pm
       JOIN memberships m ON m.id = pm.membership_id AND m.company_id = pm.company_id
       JOIN users u ON u.id = m.user_id
       WHERE pm.company_id = $1 AND pm.project_id = $2
       ORDER BY pm.created_at`,
      [companyId, projectId],
    )) as ProjectMemberRow[];
  }

  async findMembershipByUser(
    companyId: string,
    userId: string,
  ): Promise<{ id: string; status: string } | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id, status FROM memberships
         WHERE company_id = $1 AND user_id = $2 AND status = 'active'
         LIMIT 1`,
        [companyId, userId],
      )) as Array<{ id: string; status: string }>;
      return rows[0] ?? null;
    });
  }

  async addMember(
    companyId: string,
    projectId: string,
    membershipId: string,
    projectRole: ProjectRole,
  ): Promise<ProjectMemberRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO project_members (company_id, project_id, membership_id, project_role)
         SELECT $1, p.id, $3, $4
         FROM projects p
         WHERE p.id = $2 AND p.company_id = $1 AND p.deleted_at IS NULL
         ON CONFLICT (project_id, membership_id)
         DO UPDATE SET project_role = EXCLUDED.project_role
         RETURNING membership_id`,
        [companyId, projectId, membershipId, projectRole],
      )) as Array<{ membership_id: string }>;
      if (!rows[0]) return null;
      const members = await this.listMembersWithRunner(queryRunner, companyId, projectId);
      return members.find((member) => member.membership_id === membershipId) ?? null;
    });
  }

  async updateMemberRole(
    companyId: string,
    projectId: string,
    membershipId: string,
    projectRole: ProjectRole,
  ): Promise<ProjectMemberRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE project_members
         SET project_role = $4
         WHERE company_id = $1 AND project_id = $2 AND membership_id = $3
         RETURNING membership_id`,
        [companyId, projectId, membershipId, projectRole],
      )) as Array<{ membership_id: string }>;
      if (!rows[0]) return null;
      const members = await this.listMembersWithRunner(queryRunner, companyId, projectId);
      return members.find((member) => member.membership_id === membershipId) ?? null;
    });
  }

  async removeMember(
    companyId: string,
    projectId: string,
    membershipId: string,
  ): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM project_members
         WHERE company_id = $1 AND project_id = $2 AND membership_id = $3
         RETURNING membership_id`,
        [companyId, projectId, membershipId],
      )) as Array<{ membership_id: string }>;
      return Boolean(rows[0]);
    });
  }

  async branchExists(companyId: string, branchId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM branches
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [branchId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async partyExists(companyId: string, partyId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM parties
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [partyId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async currencyExists(code: string): Promise<boolean> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT code FROM currencies WHERE code = $1 AND is_active`,
        [code],
      )) as Array<{ code: string }>;
      return Boolean(rows[0]);
    });
  }
}
