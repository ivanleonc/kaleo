import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { rows } from '../common/utils/db.js';
import { runInTransaction } from '../common/utils/transaction.helper.js';
import { upsertMembershipWithRoles } from '../common/utils/membership.helper.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';

export interface CreatedInvitation {
  id: string;
  email: string;
  expires_at: string;
}

export interface PendingInvitation {
  id: string;
  company_id: string;
  company_name: string;
  email: string;
  name: string | null;
  expires_at: string;
  role_ids: string[];
}

export interface InvitationListRow {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  expires_at: string;
  created_at: string;
}

export interface UserLookupRow {
  id: string;
  email: string;
  name: string | null;
}

export interface AcceptedUser {
  id: string;
  email: string;
  name: string | null;
}

@Injectable()
export class InvitationsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async create(
    input: {
      companyId: string;
      invitedBy: string;
      email: string;
      name?: string | null;
      tokenHash: string;
      expiresAt: Date;
      roleIds: string[];
    },
    onCreated?: (
      queryRunner: QueryRunner,
      invitation: CreatedInvitation & { name: string | null; roleIds: string[] },
    ) => Promise<void>,
  ): Promise<CreatedInvitation> {
    this.assertCompany(input.companyId);
    let invitation: CreatedInvitation | undefined;

    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      // Una sola pendiente por email: la anterior se invalida.
      await queryRunner.query(
        `UPDATE invitations
         SET status = 'revoked', updated_at = now()
         WHERE company_id = $1 AND lower(email) = lower($2) AND status = 'pending'`,
        [input.companyId, input.email],
      );

      const inserted = rows<CreatedInvitation>(await queryRunner.query(
        `INSERT INTO invitations (company_id, email, name, token_hash, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, expires_at`,
        [
          input.companyId,
          input.email,
          input.name ?? null,
          input.tokenHash,
          input.invitedBy,
          input.expiresAt,
        ],
      ));
      invitation = inserted[0]!;

      if (input.roleIds.length > 0) {
        const values = input.roleIds.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
        await queryRunner.query(
          `INSERT INTO invitation_roles (company_id, invitation_id, role_id)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [input.companyId, invitation.id, ...input.roleIds],
        );
      }

      if (onCreated) {
        await onCreated(queryRunner, {
          ...invitation,
          name: input.name ?? null,
          roleIds: input.roleIds,
        });
      }
    });

    return invitation!;
  }

  async findPendingByTokenHash(tokenHash: string): Promise<PendingInvitation | undefined> {
    return rows<PendingInvitation>(await this.dataSource.query(
      `SELECT i.id, i.company_id, c.name AS company_name, i.email, i.name, i.expires_at,
              COALESCE(array_agg(ir.role_id) FILTER (WHERE ir.role_id IS NOT NULL), '{}') AS role_ids
       FROM invitations i
       INNER JOIN companies c ON c.id = i.company_id
       LEFT JOIN invitation_roles ir
         ON ir.invitation_id = i.id AND ir.company_id = i.company_id
       WHERE i.token_hash = $1 AND i.status = 'pending'
       GROUP BY i.id, c.name`,
      [tokenHash],
    ))[0];
  }

  async findUserByEmail(email: string): Promise<UserLookupRow | undefined> {
    return rows<UserLookupRow>(await this.dataSource.query(
      `SELECT id, email, name FROM users
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1`,
      [email],
    ))[0];
  }

  async findUserById(userId: string): Promise<UserLookupRow | undefined> {
    return rows<UserLookupRow>(await this.dataSource.query(
      `SELECT id, email, name FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    ))[0];
  }

  async acceptForNewUser(input: {
    invitationId: string;
    companyId: string;
    email: string;
    name: string;
    passwordHash: string;
    roleIds: string[];
  }): Promise<AcceptedUser> {
    let user: AcceptedUser | undefined;

    await runInTransaction(this.dataSource, async (queryRunner) => {
      const updated = rows<{ id: string }>(await queryRunner.query(
        `UPDATE invitations
         SET status = 'accepted', accepted_at = now(), updated_at = now()
         WHERE id = $1 AND company_id = $2 AND status = 'pending'
         RETURNING id`,
        [input.invitationId, input.companyId],
      ));
      if (updated.length === 0) {
        throw new ConflictException('La invitación ya fue aceptada o revocada');
      }

      const created = rows<AcceptedUser>(await queryRunner.query(
        `INSERT INTO users (email, password_hash, name, must_change_password, email_verified)
         VALUES ($1, $2, $3, FALSE, TRUE)
         RETURNING id, email, name`,
        [input.email, input.passwordHash, input.name],
      ));
      user = created[0]!;

      await upsertMembershipWithRoles(queryRunner, user.id, input.companyId, input.roleIds);
      await queryRunner.query(
        `UPDATE invitations SET accepted_by = $1 WHERE id = $2 AND company_id = $3`,
        [user.id, input.invitationId, input.companyId],
      );
    });

    return user!;
  }

  async acceptForExistingUser(input: {
    invitationId: string;
    companyId: string;
    userId: string;
    roleIds: string[];
  }): Promise<{ alreadyMember: boolean }> {
    let alreadyMember = false;

    await runInTransaction(this.dataSource, async (queryRunner) => {
      const updated = rows<{ id: string }>(await queryRunner.query(
        `UPDATE invitations
         SET status = 'accepted', accepted_at = now(), accepted_by = $3, updated_at = now()
         WHERE id = $1 AND company_id = $2 AND status = 'pending'
         RETURNING id`,
        [input.invitationId, input.companyId, input.userId],
      ));
      if (updated.length === 0) {
        throw new ConflictException('La invitación ya fue aceptada o revocada');
      }

      const member = rows<{ one: number }>(await queryRunner.query(
        `SELECT 1 AS one FROM memberships
         WHERE user_id = $1 AND company_id = $2 AND status = 'active' LIMIT 1`,
        [input.userId, input.companyId],
      ));
      alreadyMember = member.length > 0;

      if (!alreadyMember) {
        await upsertMembershipWithRoles(queryRunner, input.userId, input.companyId, input.roleIds);
      }
    });

    return { alreadyMember };
  }

  async listPending(companyId: string): Promise<InvitationListRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      rows<InvitationListRow>(await queryRunner.query(
        `SELECT i.id, i.email, i.name, i.expires_at, i.created_at,
                COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
         FROM invitations i
         LEFT JOIN invitation_roles ir
           ON ir.invitation_id = i.id AND ir.company_id = i.company_id
         LEFT JOIN roles r ON r.id = ir.role_id
         WHERE i.company_id = $1 AND i.status = 'pending'
         GROUP BY i.id
         ORDER BY i.created_at DESC`,
        [companyId],
      )),
    );
  }

  async revoke(companyId: string, invitationId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const updated = rows<{ id: string }>(await queryRunner.query(
        `UPDATE invitations
         SET status = 'revoked', updated_at = now()
         WHERE company_id = $1 AND id = $2 AND status = 'pending'
         RETURNING id`,
        [companyId, invitationId],
      ));
      return updated.length > 0;
    });
  }
}
