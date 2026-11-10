import { Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { sha256 } from '../../common/utils/crypto.js';

export interface IdempotencyRecord {
  id: string;
  scope: string;
  request_hash: string;
  status: 'processing' | 'completed';
  response_status: number | null;
  response_body: unknown;
}

export type IdempotencyBegin =
  | { kind: 'new'; id: string }
  | { kind: 'replay'; record: IdempotencyRecord }
  | { kind: 'processing' }
  | { kind: 'conflict' };

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  private get db(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  async begin(input: {
    companyId: string;
    userId: string;
    key: string;
    scope: string;
    requestBody: unknown;
  }): Promise<IdempotencyBegin> {
    await this.db.query(
      `DELETE FROM idempotency_keys
       WHERE expires_at < now()
         AND company_id = $1 AND user_id = $2 AND idempotency_key = $3`,
      [input.companyId, input.userId, input.key],
    );

    const requestHash = hashPayload(input.scope, input.requestBody);
    const inserted = await this.db.query(
      `INSERT INTO idempotency_keys
         (company_id, user_id, idempotency_key, scope, request_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'processing')
       ON CONFLICT (company_id, user_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [input.companyId, input.userId, input.key, input.scope, requestHash],
    );

    const insertedRow = normalizeRows(inserted)[0];
    if (insertedRow?.id) return { kind: 'new', id: insertedRow.id as string };

    const existing = normalizeRows(await this.db.query(
      `SELECT id, scope, request_hash, status, response_status, response_body
       FROM idempotency_keys
       WHERE company_id = $1 AND user_id = $2 AND idempotency_key = $3`,
      [input.companyId, input.userId, input.key],
    ))[0] as IdempotencyRecord | undefined;

    if (!existing) return { kind: 'new', id: '' };
    if (existing.request_hash !== requestHash) return { kind: 'conflict' };
    if (existing.status === 'processing') return { kind: 'processing' };
    return { kind: 'replay', record: existing };
  }

  async complete(
    id: string,
    responseStatus: number,
    responseBody: unknown,
  ): Promise<void> {
    await this.db.query(
      `UPDATE idempotency_keys
       SET status = 'completed',
           response_status = $2,
           response_body = $3::jsonb,
           updated_at = now()
       WHERE id = $1`,
      [id, responseStatus, JSON.stringify(responseBody ?? null)],
    );
  }

  async fail(id: string): Promise<void> {
    await this.db.query(`DELETE FROM idempotency_keys WHERE id = $1`, [id]);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.db.query(
      `DELETE FROM idempotency_keys WHERE expires_at < now()`,
    );
    return result.rowCount ?? 0;
  }
}

function hashPayload(scope: string, body: unknown): string {
  return sha256(`${scope}\n${stableStringify(body)}`);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}

function normalizeRows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  return Array.isArray(result) ? result : [];
}
