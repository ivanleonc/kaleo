import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service.js';
import type { JobRow } from './jobs.types.js';

function job(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: 'job-1',
    company_id: 'company-1',
    queue: 'email.send',
    payload: { to: 'a@b.com' },
    status: 'running',
    run_at: new Date().toISOString(),
    attempts: 1,
    max_attempts: 5,
    locked_at: new Date().toISOString(),
    locked_by: 'worker',
    last_error: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createStub(claimed: JobRow[] = []) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (sql.includes('RETURNING j.id')) return claimed;
    if (sql.includes('INSERT INTO jobs')) return [{ id: 'job-new' }];
    return [];
  });
  return { dataSource: { query } as any, queries };
}

describe('JobsService', () => {
  it('enqueue usa el QueryRunner de la transacción', async () => {
    const { dataSource, queries } = createStub();
    const service = new JobsService(dataSource);
    const runner = { query: dataSource.query };

    await service.enqueue({ companyId: 'company-1', queue: 'email.send' }, runner as any);

    expect(queries[0]!.sql).toContain('INSERT INTO jobs');
    expect(queries[0]!.params[0]).toBe('company-1');
    expect(queries[0]!.params[1]).toBe('email.send');
  });

  it('runPending reclama y completa un job', async () => {
    const { dataSource, queries } = createStub([job()]);
    const service = new JobsService(dataSource);
    const handler = vi.fn(async () => {});
    service.registerHandler('email.send', handler);

    await expect(service.runPending()).resolves.toBe(1);

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }));
    expect(queries.some((q) => q.sql.includes("status = 'completed'"))).toBe(true);
  });

  it('reprograma con backoff cuando falla', async () => {
    const { dataSource, queries } = createStub([job({ attempts: 2 })]);
    const service = new JobsService(dataSource);
    service.registerHandler('email.send', async () => {
      throw new Error('smtp down');
    });

    await service.runPending();

    const retry = queries.find((q) => q.sql.includes('run_at = now() +'));
    expect(retry?.params).toEqual(['job-1', 10, 'smtp down']);
  });

  it('manda a dead-letter al agotar intentos', async () => {
    const { dataSource, queries } = createStub([job({ attempts: 5, max_attempts: 5 })]);
    const service = new JobsService(dataSource);
    service.registerHandler('email.send', async () => {
      throw new Error('smtp down');
    });

    await service.runPending();

    const dead = queries.find((q) => q.sql.includes("status = 'dead_letter'"));
    expect(dead?.params).toEqual(['job-1', 'smtp down']);
  });

  it('falla el job si no hay handler', async () => {
    const { dataSource, queries } = createStub([job({ queue: 'unknown' })]);
    const service = new JobsService(dataSource);

    await service.runPending();

    const retry = queries.find((q) => q.sql.includes('run_at = now() +'));
    expect(retry?.params[2]).toContain('No hay handler');
  });
});
