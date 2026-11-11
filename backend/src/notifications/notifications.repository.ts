import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import type {
  NotificationPreferenceRow,
  NotificationRow,
} from './notifications.types.js';

@Injectable()
export class NotificationsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  private get privilegedDataSource(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async list(
    companyId: string,
    userId: string,
    options: { unreadOnly: boolean; limit: number },
  ): Promise<NotificationRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM notifications
         WHERE company_id = $1 AND user_id = $2
           AND ($3::boolean = false OR read_at IS NULL)
         ORDER BY created_at DESC
         LIMIT $4`,
        [companyId, userId, options.unreadOnly, options.limit],
      )) as NotificationRow[];
      return rows;
    });
  }

  async unreadCount(companyId: string, userId: string): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count FROM notifications
         WHERE company_id = $1 AND user_id = $2 AND read_at IS NULL`,
        [companyId, userId],
      )) as Array<{ count: number }>;
      return rows[0]?.count ?? 0;
    });
  }

  async create(input: {
    companyId: string;
    userId: string;
    type: string;
    category: string;
    title: string;
    body: string | null;
    link: string | null;
    data: Record<string, unknown>;
  }): Promise<NotificationRow> {
    this.assertCompany(input.companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO notifications
           (company_id, user_id, type, category, title, body, link, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,
        [
          input.companyId,
          input.userId,
          input.type,
          input.category,
          input.title,
          input.body,
          input.link,
          JSON.stringify(input.data),
        ],
      )) as NotificationRow[];
      return rows[0];
    });
  }

  async markRead(
    companyId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, now())
         WHERE id = $1 AND company_id = $2 AND user_id = $3
         RETURNING *`,
        [notificationId, companyId, userId],
      )) as NotificationRow[];
      return rows[0] ?? null;
    });
  }

  async markAllRead(companyId: string, userId: string): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE notifications
         SET read_at = now()
         WHERE company_id = $1 AND user_id = $2 AND read_at IS NULL
         RETURNING id`,
        [companyId, userId],
      )) as Array<{ id: string }>;
      return rows.length;
    });
  }

  async markEmailed(companyId: string, notificationId: string): Promise<void> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE notifications SET emailed_at = now()
         WHERE id = $1 AND company_id = $2`,
        [notificationId, companyId],
      );
    });
  }

  async getPreferences(
    companyId: string,
    userId: string,
  ): Promise<Map<string, NotificationPreferenceRow>> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT category, in_app, email_enabled
         FROM notification_preferences
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId],
      )) as NotificationPreferenceRow[];
      return new Map(rows.map((row) => [row.category, row]));
    });
  }

  async upsertPreferences(
    companyId: string,
    userId: string,
    preferences: Array<{ category: string; inApp: boolean; email: boolean }>,
  ): Promise<void> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      for (const preference of preferences) {
        await queryRunner.query(
          `INSERT INTO notification_preferences
             (company_id, user_id, category, in_app, email_enabled)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (company_id, user_id, category) DO UPDATE SET
             in_app = EXCLUDED.in_app,
             email_enabled = EXCLUDED.email_enabled`,
          [
            companyId,
            userId,
            preference.category,
            preference.inApp,
            preference.email,
          ],
        );
      }
    });
  }

  /** Email del destinatario. Consulta privilegiada: `users` no es tenant-scoped. */
  async getUserEmail(userId: string): Promise<string | null> {
    const rows = (await this.privilegedDataSource.query(
      `SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    )) as Array<{ email: string }>;
    return rows[0]?.email ?? null;
  }
}
