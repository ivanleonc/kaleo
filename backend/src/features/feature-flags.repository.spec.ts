import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FeatureFlagsRepository } from './feature-flags.repository.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';

function createStub(result: unknown[] = []) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    return result;
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
  return { dataSource, calls, runner };
}

function withContext<T>(context: TenantContextService, fn: () => Promise<T>): Promise<T> {
  return context.run({ requestId: 'req-1', userId: 'user-1', isSuperAdmin: false }, async () => {
    context.setCompany('company-1', 'user-1');
    return fn();
  });
}

describe('FeatureFlagsRepository', () => {
  it('isEnabled consulta bajo kaleo_app y app.company_id', async () => {
    const { dataSource, calls } = createStub([{ enabled: true }]);
    const context = new TenantContextService();
    const repository = new FeatureFlagsRepository(dataSource as any, context);

    await withContext(context, async () => {
      await expect(repository.isEnabled('company-1', 'construction.apus_v2')).resolves.toBe(true);
    });

    const roleQuery = calls.find((c) => c.sql.includes('SET LOCAL ROLE kaleo_app'));
    expect(roleQuery).toBeDefined();
    const companyConfig = calls.find((c) => c.sql.includes("set_config('app.company_id'"));
    expect(companyConfig?.params).toEqual(['company-1']);
    const dataQuery = calls.find((c) => c.sql.includes('SELECT enabled FROM feature_flags'));
    expect(dataQuery?.params).toEqual(['company-1', 'construction.apus_v2']);
  });

  it('rechaza una empresa distinta al TenantContext', async () => {
    const { dataSource } = createStub([]);
    const context = new TenantContextService();
    const repository = new FeatureFlagsRepository(dataSource as any, context);

    await withContext(context, async () => {
      await expect(repository.isEnabled('otra-empresa', 'a.flag'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('listByCompany filtra por empresa y ordena por flag', async () => {
    const { dataSource, calls } = createStub([
      { flag: 'a.flag', enabled: true, description: null, updated_at: '2026-11-10T00:00:00Z' },
    ]);
    const context = new TenantContextService();
    const repository = new FeatureFlagsRepository(dataSource as any, context);

    await withContext(context, async () => {
      const flags = await repository.listByCompany('company-1');
      expect(flags).toHaveLength(1);
    });

    const dataQuery = calls.find((c) => c.sql.includes('FROM feature_flags'));
    expect(dataQuery?.sql).toContain('ORDER BY flag');
    expect(dataQuery?.params).toEqual(['company-1']);
  });

  it('upsert usa ON CONFLICT y conserva la descripción', async () => {
    const { dataSource, calls } = createStub([
      { flag: 'crm.pipeline_v2', enabled: false, description: 'existente', updated_at: '2026-11-10T00:00:00Z' },
    ]);
    const context = new TenantContextService();
    const repository = new FeatureFlagsRepository(dataSource as any, context);

    await withContext(context, async () => {
      const updated = await repository.upsert('company-1', 'crm.pipeline_v2', false, null);
      expect(updated?.enabled).toBe(false);
    });

    const dataQuery = calls.find((c) => c.sql.includes('INSERT INTO feature_flags'));
    expect(dataQuery?.sql).toContain('ON CONFLICT (company_id, flag)');
    expect(dataQuery?.sql).toContain('COALESCE(EXCLUDED.description, feature_flags.description)');
    expect(dataQuery?.params).toEqual(['company-1', 'crm.pipeline_v2', false, null]);
  });
});
