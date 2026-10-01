import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor.js';

@Injectable()
export class AuditLogRepository {
  constructor(private dataSource: DataSource) {}

  async log(data: {
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
  }) {
    await this.dataSource.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, response_status, response_data, duration_ms) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
    const rows = await this.dataSource.query(
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

    return this.dataSource.query(
      `SELECT al.action, al.entity_type, al.entity_id,
              al.old_values, al.new_values, al.ip_address, al.user_agent, al.created_at,
              u.name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT 5000`,
      values,
    );
  }

  async findByUser(userId: string, limit: number = 50) {
    return this.dataSource.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
  }

  async findByCompany(companyId: string, limit: number = 50) {
    return this.dataSource.query(
      `SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit],
    );
  }

  async getEntityTypes(companyId: string) {
    return this.dataSource.query(
      `SELECT DISTINCT entity_type FROM audit_logs WHERE company_id = $1 ORDER BY entity_type`,
      [companyId],
    );
  }
}
