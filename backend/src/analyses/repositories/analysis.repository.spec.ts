import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AnalysisRepository } from './analysis.repository.js';
import { createEnergyResult } from '../testing/energy-result.fixture.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';

function createStub(handler: (sql: string, params: any[]) => unknown) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    return handler(sql, params);
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
  return { dataSource, calls };
}

function createPagedStub(total = '1') {
  return createStub((sql) => (sql.includes('COUNT') ? [{ total }] : []));
}

function runWithContext<T>(context: TenantContextService, fn: () => Promise<T>): Promise<T> {
  return context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
    context.setCompany('company-1');
    return fn();
  });
}

function businessCalls(calls: Array<{ sql: string; params: any[] }>) {
  return calls.filter(
    (c) => !c.sql.includes('SET LOCAL ROLE') && !c.sql.includes("set_config('app."),
  );
}

describe('AnalysisRepository.findPagedByCompany', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: AnalysisRepository;
  let context: TenantContextService;

  const tenantIt = (name: string, fn: () => Promise<void>) =>
    it(name, () => runWithContext(context, fn));

  beforeEach(() => {
    const stub = createPagedStub();
    calls = stub.calls;
    context = new TenantContextService();
    repository = new AnalysisRepository(stub.dataSource as any, context);
  });

  tenantIt('pagina con scope de empresa y orden por fecha descendente', async () => {
    await repository.findPagedByCompany('company-1', 2, 10);

    const dataQuery = businessCalls(calls)[1];
    expect(dataQuery.sql).toContain('a.company_id = $1');
    expect(dataQuery.sql).toContain('a.deleted_at IS NULL');
    expect(dataQuery.sql).toContain('ORDER BY a.created_at DESC, a.id');
    expect(dataQuery.sql).toContain('LIMIT $2 OFFSET $3');
    expect(dataQuery.params).toEqual(['company-1', 10, 10]);
  });

  tenantIt('busca por nombre y archivo con un placeholder reutilizado', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { search: 'enero' });

    const dataQuery = businessCalls(calls)[1];
    expect(dataQuery.sql).toContain('(a.name ILIKE $2 OR a.file_name ILIKE $2)');
    expect(dataQuery.params).toEqual(['company-1', '%enero%', 20, 0]);
    expect(dataQuery.sql).toContain('LIMIT $3 OFFSET $4');
  });

  tenantIt('filtra por tipo de análisis', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { analysis_type: 'energy' });

    expect(businessCalls(calls)[0].sql).toContain('a.analysis_type = $2');
    expect(businessCalls(calls)[0].params).toEqual(['company-1', 'energy']);
  });

  tenantIt('neutraliza intentos de inyección en sortBy', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, {
      sortBy: 'a.name; DROP TABLE analyses--',
      sortDir: 'asc',
    });

    expect(businessCalls(calls)[1].sql).not.toContain('DROP TABLE');
    expect(businessCalls(calls)[1].sql).toContain('ORDER BY a.created_at ASC');
  });

  tenantIt('acota page y limit a valores seguros', async () => {
    const stub = createPagedStub('0');
    const localContext = new TenantContextService();
    const localRepository = new AnalysisRepository(stub.dataSource as any, localContext);

    const result = await runWithContext(localContext, () =>
      localRepository.findPagedByCompany('company-1', 0, 5000),
    );

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.total).toBe(0);
  });
});

describe('AnalysisRepository mutations', () => {
  it('crea el análisis y serializa summary/result', async () => {
    const context = new TenantContextService();
    const { dataSource, calls } = createStub((sql) => {
      if (sql.includes('INSERT INTO analyses')) return [{ id: 'analysis-1' }];
      if (sql.includes('a.result')) {
        return [{
          id: 'analysis-1',
          company_id: 'company-1',
          created_by: 'user-1',
          created_by_name: 'Ana',
          name: 'Enero',
          analysis_type: 'energy',
          source: 'api',
          file_name: 'enero.xlsx',
          file_size: 120,
          summary: { periodFrom: '2026-01-01' },
          result: createEnergyResult(),
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z',
        }];
      }
      return [];
    });
    const repository = new AnalysisRepository(dataSource as any, context);

    const created = await runWithContext(context, () =>
      repository.create('company-1', 'user-1', {
        name: 'Enero',
        analysis_type: 'energy',
        source: 'api',
        file_name: 'enero.xlsx',
        file_size: 120,
        summary: { periodFrom: '2026-01-01' },
        result: createEnergyResult(),
      }),
    );

    const insert = businessCalls(calls).find((c) => c.sql.includes('INSERT INTO analyses'))!;
    expect(insert.params[0]).toBe('company-1');
    expect(insert.params[1]).toBe('user-1');
    expect(insert.params[4]).toBe('api');
    expect(JSON.parse(insert.params[7])).toEqual({ periodFrom: '2026-01-01' });
    expect(JSON.parse(insert.params[8]).meta.fileName).toBe('energia.xlsx');
    expect(created.id).toBe('analysis-1');
  });

  it('renombra y devuelve null cuando no existe', async () => {
    const context = new TenantContextService();
    const { dataSource } = createStub((sql) => (sql.includes('UPDATE analyses') ? [] : []));
    const repository = new AnalysisRepository(dataSource as any, context);

    await expect(
      runWithContext(context, () => repository.rename('analysis-1', 'company-1', 'Nuevo')),
    ).resolves.toBeNull();
  });

  it('soft delete devuelve false cuando no encuentra el análisis', async () => {
    const context = new TenantContextService();
    const { dataSource } = createStub(() => []);
    const repository = new AnalysisRepository(dataSource as any, context);

    await expect(
      runWithContext(context, () => repository.softDelete('analysis-1', 'company-1')),
    ).resolves.toBe(false);
  });
});
