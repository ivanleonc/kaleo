import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BranchRepository } from './branch.repository.js';

/**
 * Mismas convenciones que member.repository.spec.ts: DataSource falso que
 * captura consultas para validar numeración de placeholders y ORDER BY
 * whitelisteado, sin base de datos.
 */
function createDataSourceStub() {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const dataSource = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return sql.includes('COUNT') ? [{ total: '0' }] : [];
    }),
  };
  return { dataSource, calls };
}

function placeholders(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

describe('BranchRepository.findPagedByCompany', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: BranchRepository;

  beforeEach(() => {
    const stub = createDataSourceStub();
    calls = stub.calls;
    repository = new BranchRepository(stub.dataSource as any);
  });

  it('pagina sin filtros usando placeholders correlativos', async () => {
    await repository.findPagedByCompany('company-1', 2, 10);

    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('b.company_id = $1');
    expect(dataQuery.params[0]).toBe('company-1');
    expect(dataQuery.sql).toContain('LIMIT $2 OFFSET $3');
    expect(dataQuery.params.slice(1)).toEqual([10, 10]);
  });

  it('busca en los cuatro campos con un solo placeholder reutilizado', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { search: 'centro' });

    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('(b.name ILIKE $2 OR b.city ILIKE $2 OR b.state ILIKE $2 OR b.country ILIKE $2)');
    expect(dataQuery.params).toEqual(['company-1', '%centro%', 20, 0]);
    expect(dataQuery.sql).toContain('LIMIT $3 OFFSET $4');
  });

  it('filtra activas e inactivas sin consumir parámetros', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { status: 'inactive' });
    expect(calls[0].sql).toContain('b.is_active = FALSE');
    expect(calls[0].params).toEqual(['company-1']);

    calls.length = 0;
    await repository.findPagedByCompany('company-1', 1, 20, { status: 'active' });
    expect(calls[0].sql).toContain('b.is_active = TRUE');
    expect(calls[0].params).toEqual(['company-1']);
  });

  it('ordena por nombre ascendente por defecto', async () => {
    await repository.findPagedByCompany('company-1', 1, 20);

    // Antes era ORDER BY b.name: el comportamiento se preserva.
    expect(calls[1].sql).toContain('ORDER BY b.name ASC, b.name');
  });

  it('ordena por ciudad descendente con sort explícito', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'city', sortDir: 'desc' });

    expect(calls[1].sql).toContain('ORDER BY b.city DESC');
  });

  it('ordena por estado con el booleano directo', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'status', sortDir: 'asc' });

    expect(calls[1].sql).toContain('ORDER BY b.is_active ASC');
  });

  it('ordena la ubicación derivada con la expresión compuesta', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'location' });

    expect(calls[1].sql).toContain("COALESCE(b.city, '')");
  });

  it('neutraliza intentos de inyección en sortBy', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, {
      sortBy: 'b.name; DROP TABLE branches--',
    });

    const sql = calls[1].sql;
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('ORDER BY b.name ASC');
  });

  it('mantiene la numeración más alta igual al largo de los valores', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { search: 'a', status: 'active' });

    for (const call of calls) {
      const max = Math.max(...placeholders(call.sql));
      expect(max).toBeLessThanOrEqual(call.params.length);
    }
  });

  it('acota page y limit a valores seguros', async () => {
    const result = await repository.findPagedByCompany('company-1', 0, 5000);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});
