import { describe, expect, it, vi } from 'vitest';
import { OperationsJobHandler } from './operations-job.handler.js';
import type { JobRow } from '../jobs/jobs.types.js';

const OPERATION = {
  id: 'op-1',
  company_id: 'company-1',
  user_id: 'user-1',
  kind: 'export',
  resource: 'members',
  format: 'csv',
  status: 'pending',
  filename: null,
  content_type: null,
  data: null,
  result: null,
  error: null,
  created_at: new Date().toISOString(),
  completed_at: null,
};

function job(overrides: Partial<JobRow> = {}): JobRow {
  return {
    id: 'job-1',
    company_id: 'company-1',
    queue: 'export.generate',
    payload: { operationId: 'op-1' },
    status: 'running',
    run_at: new Date().toISOString(),
    attempts: 1,
    max_attempts: 5,
    locked_at: null,
    locked_by: null,
    last_error: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createHandler(operationOverrides: Record<string, unknown> = {}) {
  const handlers = new Map<string, (job: JobRow) => Promise<void>>();
  const operations = {
    getForWorker: vi.fn(async () => ({ ...OPERATION, ...operationOverrides })),
    markProcessing: vi.fn(async () => {}),
    markReady: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
  } as any;
  const members = {
    exportMembers: vi.fn(async () => ({
      buffer: Buffer.from('a,b'),
      filename: 'x.csv',
      contentType: 'text/csv',
    })),
  } as any;
  const branches = {
    createBranch: vi.fn(async () => ({ id: 'b-1' })),
  } as any;

  const handler = new OperationsJobHandler(
    { registerHandler: (queue: string, fn: any) => handlers.set(queue, fn) } as any,
    operations,
    members,
    branches,
    {} as any,
    {} as any,
  );
  handler.onModuleInit();
  return { handler, handlers, operations, members, branches };
}

describe('OperationsJobHandler', () => {
  it('genera el archivo y marca la operación lista', async () => {
    const { handlers, operations, members } = createHandler();
    const run = handlers.get('export.generate')!;

    await run(job());

    expect(members.exportMembers).toHaveBeenCalledWith(
      'company-1',
      expect.any(Object),
      expect.any(Object),
      'csv',
      [],
    );
    expect(operations.markReady).toHaveBeenCalledWith(
      'op-1',
      expect.objectContaining({ filename: 'x.csv', contentType: 'text/csv' }),
    );
  });

  it('marca failed si el export lanza', async () => {
    const { handlers, operations, members } = createHandler();
    members.exportMembers.mockRejectedValueOnce(new Error('export boom'));
    const run = handlers.get('export.generate')!;

    await expect(run(job())).rejects.toThrow('export boom');
    expect(operations.markFailed).toHaveBeenCalledWith('op-1', 'export boom');
  });

  it('procesa filas de import y reporta creadas/fallidas', async () => {
    const { handlers, operations, branches } = createHandler({
      kind: 'import',
      resource: 'branches',
      format: null,
    });
    branches.createBranch
      .mockResolvedValueOnce({ id: 'b-1' })
      .mockRejectedValueOnce(new Error('code duplicado'));
    const run = handlers.get('import.branches')!;

    await run(
      job({
        queue: 'import.branches',
        payload: {
          operationId: 'op-1',
          rows: [{ name: 'Sede Norte' }, { name: 'Sede Sur' }],
        },
      }),
    );

    expect(branches.createBranch).toHaveBeenCalledTimes(2);
    expect(operations.markReady).toHaveBeenCalledWith('op-1', {
      summary: {
        created: 1,
        failed: 1,
        errors: [{ index: 1, message: 'code duplicado' }],
      },
    });
  });
});
