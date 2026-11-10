import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BranchRepository } from './branch.repository.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';

/**
 * Mismas convenciones que member.repository.spec.ts: DataSource falso que
 * captura consultas para validar numeración de placeholders y ORDER BY
 * whitelisteado, sin base de datos.
 */
function createDataSourceStub() {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    return sql.includes('COUNT') ? [{ total: '0' }] : [];
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

function placeholders(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

describe('BranchRepository.findPagedByCompany', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: BranchRepository;
  let context: TenantContextService;

  const businessCalls = () =>
    calls.filter(
      (c) => !c.sql.includes('SET LOCAL ROLE') && !c.sql.includes("set_config('app."),
    );

  const tenantIt = (name: string, fn: () => Promise<void> | void) =>
    it(name, () =>
      context.run({ requestId: 'req-1', isSuperAdmin: false }, async () => {
        context.setCompany('company-1');
        await fn();
      }),
    );

  beforeEach(() => {
    const stub = createDataSourceStub();
    calls = stub.calls;
    context = new TenantContextService();
    repository = new BranchRepository(stub.dataSource as any, context);
  });

  tenantIt('pagina sin filtros usando placeholders correlativos', async () => {
    await repository.findPagedByCompany('company-1', 2, 10);

    const dataQuery = businessCalls()[1];
    expect(dataQuery.sql).toContain('b.company_id = $1');
    expect(dataQuery.params[0]).toBe('company-1');
    expect(dataQuery.sql).toContain('LIMIT $2 OFFSET $3');
    expect(dataQuery.params.slice(1)).toEqual([10, 10]);
  });

  tenantIt('busca en los cuatro campos con un solo placeholder reutilizado', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { search: 'centro' });

    const dataQuery = businessCalls()[1];
    expect(dataQuery.sql).toContain('(b.name ILIKE $2 OR b.city ILIKE $2 OR b.state ILIKE $2 OR b.country ILIKE $2)');
    expect(dataQuery.params).toEqual(['company-1', '%centro%', 20, 0]);
    expect(dataQuery.sql).toContain('LIMIT $3 OFFSET $4');
  });

  tenantIt('filtra activas e inactivas sin consumir parámetros', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { status: 'inactive' });
    expect(businessCalls()[0].sql).toContain('b.is_active = FALSE');
    expect(businessCalls()[0].params).toEqual(['company-1']);

    calls.length = 0;
    await repository.findPagedByCompany('company-1', 1, 20, { status: 'active' });
    expect(businessCalls()[0].sql).toContain('b.is_active = TRUE');
    expect(businessCalls()[0].params).toEqual(['company-1']);
  });

  tenantIt('ordena por nombre ascendente por defecto', async () => {
    await repository.findPagedByCompany('company-1', 1, 20);

    // Antes era ORDER BY b.name: el comportamiento se preserva.
    expect(businessCalls()[1].sql).toContain('ORDER BY b.name ASC, b.name');
  });

  tenantIt('ordena por ciudad descendente con sort explícito', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'city', sortDir: 'desc' });

    expect(businessCalls()[1].sql).toContain('ORDER BY b.city DESC');
  });

  tenantIt('ordena por estado con el booleano directo', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'status', sortDir: 'asc' });

    expect(businessCalls()[1].sql).toContain('ORDER BY b.is_active ASC');
  });

  tenantIt('ordena la ubicación derivada con la expresión compuesta', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, { sortBy: 'location' });

    expect(businessCalls()[1].sql).toContain("COALESCE(b.city, '')");
  });

  tenantIt('neutraliza intentos de inyección en sortBy', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, {}, {
      sortBy: 'b.name; DROP TABLE branches--',
    });

    const sql = businessCalls()[1].sql;
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('ORDER BY b.name ASC');
  });

  tenantIt('mantiene la numeración más alta igual al largo de los valores', async () => {
    await repository.findPagedByCompany('company-1', 1, 20, { search: 'a', status: 'active' });

    for (const call of businessCalls()) {
      const max = Math.max(...placeholders(call.sql));
      expect(max).toBeLessThanOrEqual(call.params.length);
    }
  });

  tenantIt('acota page y limit a valores seguros', async () => {
    const result = await repository.findPagedByCompany('company-1', 0, 5000);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});

describe('BranchRepository.getBranchScope', () => {
  function repositoryWithRow(row: any) {
    const context = new TenantContextService();
    const query = vi.fn(async () => (row ? [row] : []));
    const runner = {
      connect: vi.fn(async () => {}),
      startTransaction: vi.fn(async () => {}),
      query,
      commitTransaction: vi.fn(async () => {}),
      rollbackTransaction: vi.fn(async () => {}),
      release: vi.fn(async () => {}),
    };
    const dataSource = { query, createQueryRunner: () => runner };
    return { repository: new BranchRepository(dataSource as any, context), context };
  }

  async function scopeFor(row: any) {
    const { repository: repo, context } = repositoryWithRow(row);
    return context.run({ requestId: 'req-1', isSuperAdmin: false }, async () => {
      context.setCompany('company-1', 'user-1');
      return repo.getBranchScope('company-1');
    });
  }

  it('devuelve null para Owner y Admin', async () => {
    await expect(scopeFor({ admin_roles: ['Admin'], branch_ids: ['b-1'] })).resolves.toBeNull();
  });

  it('devuelve las sedes asignadas a un usuario no administrador', async () => {
    await expect(scopeFor({ admin_roles: [], branch_ids: ['b-1', 'b-2'] }))
      .resolves.toEqual(['b-1', 'b-2']);
  });

  it('sin sedes asignadas mantiene el alcance global', async () => {
    await expect(scopeFor({ admin_roles: [], branch_ids: [] })).resolves.toBeNull();
  });

  it('falla cerrado si no hay membership', async () => {
    await expect(scopeFor(null)).resolves.toEqual([]);
  });
});
