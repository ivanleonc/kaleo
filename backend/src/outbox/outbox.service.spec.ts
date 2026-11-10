import { describe, expect, it, vi } from 'vitest';
import { OutboxService } from './outbox.service.js';

function createRunnerStub(handlers: Array<{ match: RegExp; rows: any[] }>) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    return handlers.find((h) => h.match.test(sql))?.rows ?? [];
  });
  const runner = {
    connect: vi.fn(async () => {}),
    startTransaction: vi.fn(async () => {}),
    query,
    commitTransaction: vi.fn(async () => {}),
    rollbackTransaction: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
  };
  const dataSource = { query, createQueryRunner: () => runner };
  return { dataSource, queries, runner };
}

const EVENT = {
  id: 'outbox-1',
  event_id: 'evt-1',
  company_id: 'company-1',
  aggregate_type: 'Company',
  aggregate_id: 'company-1',
  event_type: 'company.created',
  payload: { name: 'Acme' },
  occurred_at: '2026-11-10T00:00:00Z',
  attempts: 0,
};

describe('OutboxService', () => {
  it('enqueue usa la transacción recibida', async () => {
    const { dataSource, queries } = createRunnerStub([
      { match: /INSERT INTO outbox_events/, rows: [{ event_id: 'evt-1' }] },
    ]);
    const service = new OutboxService(dataSource as any);
    const runner = dataSource.createQueryRunner();

    const eventId = await service.enqueue({
      companyId: 'company-1',
      aggregateType: 'Company',
      aggregateId: 'company-1',
      eventType: 'company.created',
      payload: { name: 'Acme' },
    }, runner as any);

    expect(eventId).toBe('evt-1');
    expect(queries[0]!.sql).toContain('INSERT INTO outbox_events');
    expect(queries[0]!.params[1]).toBe('company-1');
    expect(queries[0]!.params[4]).toBe('company.created');
  });

  it('publishPending procesa handlers y marca publicado', async () => {
    const { dataSource, queries, runner } = createRunnerStub([
      { match: /SELECT id, event_id/, rows: [EVENT] },
      { match: /UPDATE outbox_events/, rows: [] },
    ]);
    const service = new OutboxService(dataSource as any);
    const handler = vi.fn(async () => {});
    service.registerHandler('company.created', handler);

    const count = await service.publishPending();

    expect(count).toBe(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ event_id: 'evt-1' }));
    expect(queries[0]!.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(queries[1]!.sql).toContain('published_at = now()');
    expect(runner.commitTransaction).toHaveBeenCalled();
  });

  it('un handler que falla deja last_error y no publica ese evento', async () => {
    const { dataSource, queries, runner } = createRunnerStub([
      { match: /SELECT id, event_id/, rows: [EVENT] },
      { match: /UPDATE outbox_events/, rows: [] },
    ]);
    const service = new OutboxService(dataSource as any);
    service.registerHandler('company.created', async () => {
      throw new Error('handler boom');
    });

    await service.publishPending();

    const failureUpdate = queries.find((q) => q.sql.includes('last_error = $2'));
    expect(failureUpdate?.params).toEqual(['outbox-1', 'handler boom']);
    expect(runner.commitTransaction).toHaveBeenCalled();
  });

  it('publishPending hace rollback si falla la consulta', async () => {
    const { dataSource, runner } = createRunnerStub([]);
    runner.query.mockRejectedValueOnce(new Error('db down'));
    const service = new OutboxService(dataSource as any);

    await expect(service.publishPending()).rejects.toThrow('db down');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });
});
