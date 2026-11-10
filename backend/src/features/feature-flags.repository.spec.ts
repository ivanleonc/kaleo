import { describe, expect, it, vi } from 'vitest';
import { FeatureFlagsRepository } from './feature-flags.repository.js';

function createStub(result: unknown[] = []) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const dataSource = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return result;
    }),
  };
  return { dataSource, calls };
}

describe('FeatureFlagsRepository', () => {
  it('isEnabled busca por empresa y flag', async () => {
    const { dataSource, calls } = createStub([{ enabled: true }]);
    const repository = new FeatureFlagsRepository(dataSource as any);

    await expect(repository.isEnabled('company-1', 'construction.apus_v2')).resolves.toBe(true);

    expect(calls[0]!.sql).toContain('company_id = $1 AND flag = $2');
    expect(calls[0]!.params).toEqual(['company-1', 'construction.apus_v2']);
  });

  it('isEnabled devuelve false si no existe la fila', async () => {
    const { dataSource } = createStub([]);
    const repository = new FeatureFlagsRepository(dataSource as any);

    await expect(repository.isEnabled('company-1', 'no.existe')).resolves.toBe(false);
  });

  it('listByCompany ordena por flag y filtra por empresa', async () => {
    const { dataSource, calls } = createStub([
      { flag: 'a.flag', enabled: true, description: null, updated_at: '2026-11-10T00:00:00Z' },
    ]);
    const repository = new FeatureFlagsRepository(dataSource as any);

    const flags = await repository.listByCompany('company-1');

    expect(flags).toHaveLength(1);
    expect(calls[0]!.sql).toContain('WHERE company_id = $1');
    expect(calls[0]!.sql).toContain('ORDER BY flag');
    expect(calls[0]!.params).toEqual(['company-1']);
  });

  it('upsert usa ON CONFLICT y conserva la descripción existente', async () => {
    const { dataSource, calls } = createStub([
      { flag: 'crm.pipeline_v2', enabled: false, description: 'existente', updated_at: '2026-11-10T00:00:00Z' },
    ]);
    const repository = new FeatureFlagsRepository(dataSource as any);

    const updated = await repository.upsert('company-1', 'crm.pipeline_v2', false, null);

    expect(updated?.enabled).toBe(false);
    expect(calls[0]!.sql).toContain('ON CONFLICT (company_id, flag)');
    expect(calls[0]!.sql).toContain('COALESCE(EXCLUDED.description, feature_flags.description)');
    expect(calls[0]!.params).toEqual(['company-1', 'crm.pipeline_v2', false, null]);
  });
});
