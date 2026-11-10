import { describe, expect, it, vi } from 'vitest';
import { IdempotencyService } from './idempotency.service.js';

function createService(handlers: Array<{ match: RegExp; result: any }>) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    const hit = [...handlers].reverse().find((handler) => handler.match.test(sql));
    return hit ? hit.result : [];
  });
  return { service: new IdempotencyService({ query } as any), queries };
}

const BASE = {
  companyId: 'company-1',
  userId: 'user-1',
  key: 'idem-key-123',
  scope: 'POST /api/items',
};

describe('IdempotencyService', () => {
  it('crea una clave nueva', async () => {
    const { service } = createService([
      { match: /INSERT INTO idempotency_keys/, result: [{ id: 'idem-1' }] },
    ]);

    await expect(
      service.begin({ ...BASE, requestBody: { a: 1 } }),
    ).resolves.toEqual({ kind: 'new', id: 'idem-1' });
  });

  it('acepta [rows, count] de INSERT RETURNING', async () => {
    const { service } = createService([
      { match: /INSERT INTO idempotency_keys/, result: [[{ id: 'idem-1' }], 1] },
    ]);

    await expect(
      service.begin({ ...BASE, requestBody: { a: 1 } }),
    ).resolves.toEqual({ kind: 'new', id: 'idem-1' });
  });

  it('reproduce una respuesta completada', async () => {
    const first = createService([
      { match: /INSERT INTO idempotency_keys/, result: [{ id: 'idem-1' }] },
    ]);
    await first.service.begin({ ...BASE, requestBody: { a: 1 } });
    const hash = first.queries.find((q) => q.sql.includes('INSERT INTO idempotency_keys'))!
      .params[4];

    const replay = createService([
      { match: /INSERT INTO idempotency_keys/, result: [] },
      {
        match: /SELECT id, scope, request_hash/,
        result: [
          {
            id: 'idem-1',
            scope: BASE.scope,
            request_hash: hash,
            status: 'completed',
            response_status: 201,
            response_body: { ok: true },
          },
        ],
      },
    ]);

    await expect(
      replay.service.begin({ ...BASE, requestBody: { a: 1 } }),
    ).resolves.toMatchObject({ kind: 'replay' });
  });

  it('detecta body distinto con la misma clave', async () => {
    const { service } = createService([
      { match: /INSERT INTO idempotency_keys/, result: [] },
      {
        match: /SELECT id, scope, request_hash/,
        result: [
          {
            id: 'idem-1',
            request_hash: 'otro-hash',
            status: 'completed',
            response_status: 201,
            response_body: {},
          },
        ],
      },
    ]);

    await expect(
      service.begin({ ...BASE, requestBody: { a: 1 } }),
    ).resolves.toEqual({ kind: 'conflict' });
  });
});
