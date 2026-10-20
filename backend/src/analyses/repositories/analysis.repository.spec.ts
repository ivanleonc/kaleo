import { describe, expect, it, vi } from 'vitest';
import { AnalysisRepository } from './analysis.repository.js';
import { createEnergyResult } from '../testing/energy-result.fixture.js';

function createPagedDataSourceStub(total = '1') {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const dataSource = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return sql.includes('COUNT') ? [{ total }] : [];
    }),
  };
  return { dataSource, calls };
}

describe('AnalysisRepository.findPagedByCompany', () => {
  it('pagina con scope de empresa y orden por fecha descendente', async () => {
    const { dataSource, calls } = createPagedDataSourceStub();
    const repository = new AnalysisRepository(dataSource as any);

    await repository.findPagedByCompany('company-1', 2, 10);

    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('a.company_id = $1');
    expect(dataQuery.sql).toContain('a.deleted_at IS NULL');
    expect(dataQuery.sql).toContain('ORDER BY a.created_at DESC, a.id');
    expect(dataQuery.sql).toContain('LIMIT $2 OFFSET $3');
    expect(dataQuery.params).toEqual(['company-1', 10, 10]);
  });

  it('busca por nombre y archivo con un placeholder reutilizado', async () => {
    const { dataSource, calls } = createPagedDataSourceStub();
    const repository = new AnalysisRepository(dataSource as any);

    await repository.findPagedByCompany('company-1', 1, 20, { search: 'enero' });

    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('(a.name ILIKE $2 OR a.file_name ILIKE $2)');
    expect(dataQuery.params).toEqual(['company-1', '%enero%', 20, 0]);
    expect(dataQuery.sql).toContain('LIMIT $3 OFFSET $4');
  });

  it('filtra por tipo de análisis', async () => {
    const { dataSource, calls } = createPagedDataSourceStub();
    const repository = new AnalysisRepository(dataSource as any);

    await repository.findPagedByCompany('company-1', 1, 20, { analysis_type: 'energy' });

    expect(calls[0].sql).toContain('a.analysis_type = $2');
    expect(calls[0].params).toEqual(['company-1', 'energy']);
  });

  it('neutraliza intentos de inyección en sortBy', async () => {
    const { dataSource, calls } = createPagedDataSourceStub();
    const repository = new AnalysisRepository(dataSource as any);

    await repository.findPagedByCompany('company-1', 1, 20, {}, {
      sortBy: 'a.name; DROP TABLE analyses--',
      sortDir: 'asc',
    });

    expect(calls[1].sql).not.toContain('DROP TABLE');
    expect(calls[1].sql).toContain('ORDER BY a.created_at ASC');
  });

  it('acota page y limit a valores seguros', async () => {
    const { dataSource } = createPagedDataSourceStub('0');
    const repository = new AnalysisRepository(dataSource as any);

    const result = await repository.findPagedByCompany('company-1', 0, 5000);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.total).toBe(0);
  });
});

describe('AnalysisRepository mutations', () => {
  it('crea el análisis y serializa summary/result', async () => {
    const calls: Array<{ sql: string; params: any[] }> = [];
    const dataSource = {
      query: vi.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
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
      }),
    };
    const repository = new AnalysisRepository(dataSource as any);

    const created = await repository.create('company-1', 'user-1', {
      name: 'Enero',
      analysis_type: 'energy',
      source: 'api',
      file_name: 'enero.xlsx',
      file_size: 120,
      summary: { periodFrom: '2026-01-01' },
      result: createEnergyResult(),
    });

    const insert = calls[0];
    expect(insert.params[0]).toBe('company-1');
    expect(insert.params[1]).toBe('user-1');
    expect(insert.params[4]).toBe('api');
    expect(JSON.parse(insert.params[7])).toEqual({ periodFrom: '2026-01-01' });
    expect(JSON.parse(insert.params[8]).meta.fileName).toBe('energia.xlsx');
    expect(created.id).toBe('analysis-1');
  });

  it('renombra y devuelve null cuando no existe', async () => {
    const dataSource = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('UPDATE analyses')) return [];
        return [];
      }),
    };
    const repository = new AnalysisRepository(dataSource as any);

    await expect(repository.rename('analysis-1', 'company-1', 'Nuevo')).resolves.toBeNull();
  });

  it('soft delete devuelve false cuando no encuentra el análisis', async () => {
    const dataSource = {
      query: vi.fn(async () => []),
    };
    const repository = new AnalysisRepository(dataSource as any);

    await expect(repository.softDelete('analysis-1', 'company-1')).resolves.toBe(false);
  });
});
