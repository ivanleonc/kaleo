import { describe, expect, it, vi } from 'vitest';
import { JobsRetentionService } from './jobs-retention.service.js';

describe('JobsRetentionService', () => {
  it('elimina operaciones y jobs antiguos con los días configurados', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: 5 })
      .mockResolvedValueOnce({ rowCount: 2 });
    const config = { get: vi.fn((name: string) => (name === 'OPERATIONS_RETENTION_DAYS' ? '14' : undefined)) };
    const service = new JobsRetentionService({ query } as any, config as any);

    await expect(service.runCleanup()).resolves.toEqual({
      operations: 3,
      jobs: 5,
      idempotency: 2,
    });

    expect(query.mock.calls[0]![1]).toEqual([14]);
    expect(query.mock.calls[1]![1]).toEqual([30]);
  });
});
