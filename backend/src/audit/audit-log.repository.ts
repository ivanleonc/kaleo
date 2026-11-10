import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { EXPORT_MAX_ROWS } from '../common/export/export.types.js';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';

export interface AuditLogData {
  userId?: string;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  responseStatus?: number;
  responseData?: any;
  durationMs?: number;
  moduleCode?: string;
  source?: 'api' | 'job' | 'ai' | 'system';
  requestId?: string;
  correlationId?: string;
  actorType?: 'user' | 'bot' | 'system' | 'ai';
  actorId?: string;
}

type QueryExecutor = { query(sql: string, parameters?: any[]): Promise<any> };

@Injectable()
export class AuditLogRepository {
  constructor(
    private dataSource: DataSource,
    private tenantContext: TenantContextService,
    @Optional() @InjectDataSource('auth') private authDataSource?: DataSource,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async log(data: AuditLogData) {
    await this.insert(this.authDataSource ?? this.dataSource, data);
  }

  /**
   * Escribe la auditoría en la misma transacción que el cambio de negocio.
   * Si falla, la transacción completa hace rollback (auditoría atómica).
   */
  async logInTransaction(queryRunner: QueryRunner, data: AuditLogData) {
    await this.insert(queryRunner, data);
  }

  private async insert(executor: QueryExecutor, data: AuditLogData) {
    await executor.query(
      `INSERT INTO audit_logs (
         company_id, user_id, action, entity_type, entity_id,
         old_values, new_values, ip_address, user_agent,
         response_status, response_data, duration_ms,
         module_code, source, request_id, correlation_id, actor_type, actor_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        data.companyId,
        data.userId || null,
        data.action,
        data.entityType,
        data.entityId,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
        data.ipAddress || null,
        data.userAgent || null,
        data.responseStatus || null,
        data.responseData ? JSON.stringify(data.responseData) : null,
        data.durationMs || null,
        data.moduleCode || null,
        data.source || 'api',
        data.requestId || null,
        data.correlationId || null,
        data.actorType || 'user',
        data.actorId || data.userId || null,
      ],
    );
  }

  /**
   * Paginación por cursor (keyset) sobre `(created_at DESC, id DESC)`.
   *
   * Antes usaba `OFFSET` con un `COUNT(*)`: en `audit_logs`, particionada por
   * rango de `created_at` y con fecha por defecto de los últimos 30 días, el
   * count es una agregación cara y el `OFFSET` recorre y descarta filas. Además
   * `ORDER BY created_at` sin desempate hacía la paginación no determinista.
   */
  async findFiltered(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit: number;
    cursor?: string;
  }) {
    const { companyId, entityType, action, userId, from, to, limit, cursor } = params;
    this.assertCompany(companyId);
    const conditions: string[] = ['al.company_id = $1'];
    const values: any[] = [companyId];
    let idx = 2;

    if (entityType) {
      conditions.push(`al.entity_type = $${idx}`);
      values.push(entityType);
      idx++;
    }
    if (action) {
      conditions.push(`al.action ILIKE $${idx}`);
      values.push(`%${action}%`);
      idx++;
    }
    if (userId) {
      conditions.push(`al.user_id = $${idx}`);
      values.push(userId);
      idx++;
    }
    if (from) {
      conditions.push(`al.created_at >= $${idx}`);
      values.push(from);
      idx++;
    } else {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      conditions.push(`al.created_at >= $${idx}`);
      values.push(defaultFrom.toISOString());
      idx++;
    }
    if (to) {
      conditions.push(`al.created_at <= $${idx}`);
      values.push(to);
      idx++;
    }

    // Comparación por tuplas: equivalente a "anteriores al cursor" dado el orden.
    const decoded = cursor ? decodeAuditCursor(cursor) : null;
    if (decoded) {
      conditions.push(`(al.created_at, al.id) < ($${idx}, $${idx + 1})`);
      values.push(decoded.createdAt, decoded.id);
      idx += 2;
    }

    const where = conditions.join(' AND ');

    // Se pide una fila extra: si viene, existe página siguiente y esa fila es
    // el cursor. Evita el COUNT(*) para saber si hay más.
    const rows = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) =>
        queryRunner.query(
          `SELECT al.id, al.action, al.entity_type, al.entity_id,
                  al.new_values, al.old_values, al.ip_address, al.user_agent, al.created_at,
                  al.response_status, al.response_data, al.duration_ms,
                  al.user_id,
                  u.name as user_name, u.email as user_email
           FROM audit_logs al
           LEFT JOIN users u ON al.user_id = u.id
           WHERE ${where}
           ORDER BY al.created_at DESC, al.id DESC
           LIMIT $${idx}`,
          [...values, limit + 1],
        ),
    );

    const hasNext = rows.length > limit;
    const data = hasNext ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];

    return {
      data,
      hasNext,
      nextCursor: hasNext && lastRow ? encodeAuditCursor(lastRow) : null,
      limit,
    };
  }

  async findForExport(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    const { companyId, entityType, action, userId, from, to } = params;
    this.assertCompany(companyId);
    const conditions: string[] = ['al.company_id = $1'];
    const values: any[] = [companyId];
    let idx = 2;

    if (entityType) {
      conditions.push(`al.entity_type = $${idx}`);
      values.push(entityType);
      idx++;
    }
    if (action) {
      conditions.push(`al.action ILIKE $${idx}`);
      values.push(`%${action}%`);
      idx++;
    }
    if (userId) {
      conditions.push(`al.user_id = $${idx}`);
      values.push(userId);
      idx++;
    }
    if (from) {
      conditions.push(`al.created_at >= $${idx}`);
      values.push(from);
      idx++;
    } else {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      conditions.push(`al.created_at >= $${idx}`);
      values.push(defaultFrom.toISOString());
      idx++;
    }
    if (to) {
      conditions.push(`al.created_at <= $${idx}`);
      values.push(to);
      idx++;
    }

    const where = conditions.join(' AND ');

    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(
        `SELECT al.action, al.entity_type, al.entity_id,
                al.old_values, al.new_values, al.ip_address, al.user_agent, al.created_at,
                al.response_status, al.duration_ms,
                u.name as user_name, u.email as user_email
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE ${where}
         ORDER BY al.created_at DESC, al.id DESC
         LIMIT $${idx}`,
        [...values, EXPORT_MAX_ROWS + 1],
      ),
    );
  }

  async findByUser(userId: string, limit: number = 50) {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(
        `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit],
      ),
    );
  }

  async findByCompany(companyId: string, limit: number = 50) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(
        `SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [companyId, limit],
      ),
    );
  }

  async getEntityTypes(companyId: string) {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) =>
      queryRunner.query(
        `SELECT DISTINCT entity_type FROM audit_logs WHERE company_id = $1 ORDER BY entity_type`,
        [companyId],
      ),
    );
  }
}
