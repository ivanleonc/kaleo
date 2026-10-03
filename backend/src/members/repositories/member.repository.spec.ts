import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberRepository } from './member.repository.js';

/**
 * Valida el SQL que genera el repository usando un DataSource falso que
 * captura las consultas. Así se detectan errores de numeración de
 * placeholders ($1, $2...) sin necesitar una base de datos.
 */
function createDataSourceStub() {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const dataSource = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      // COUNT devuelve una fila; la consulta de datos devuelve vacío.
      return sql.includes('COUNT') ? [{ total: '0' }] : [];
    }),
  };
  return { dataSource, calls };
}

function placeholders(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

describe('MemberRepository.getMembersByCompany', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: MemberRepository;

  beforeEach(() => {
    const stub = createDataSourceStub();
    calls = stub.calls;
    repository = new MemberRepository(stub.dataSource as any);
  });

  it('pagina sin filtros usando placeholders correlativos', async () => {
    await repository.getMembersByCompany('company-1', 2, 10);

    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('uc.company_id = $1');
    expect(dataQuery.params[0]).toBe('company-1');
    expect(dataQuery.sql).toContain('LIMIT $2 OFFSET $3');
    expect(dataQuery.params.slice(1)).toEqual([10, 10]);
  });

  it('reutiliza el mismo placeholder para búsqueda por nombre y email', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, { search: 'juan' });

    const countQuery = calls[0];
    expect(countQuery.sql).toContain('(u.name ILIKE $2 OR u.email ILIKE $2)');
    expect(countQuery.params).toEqual(['company-1', '%juan%']);
  });

  it('encadena los tres filtros con índices consecutivos', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, {
      search: 'juan',
      status: 'inactive',
      roleId: 'role-1',
    });

    const countQuery = calls[0];
    expect(countQuery.sql).toContain('uc.company_id = $1');
    expect(countQuery.sql).toContain('u.name ILIKE $2');
    expect(countQuery.sql).toContain('u.locked_until > NOW()');
    expect(countQuery.sql).toContain('ucr.role_id = $3');
    expect(countQuery.params).toEqual(['company-1', '%juan%', 'role-1']);
  });

  it('filtra inactivos solo con la condición de bloqueo activo', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, { status: 'inactive' });

    const countQuery = calls[0];
    expect(countQuery.sql).toContain('u.locked_until IS NOT NULL AND u.locked_until > NOW()');
    expect(countQuery.params).toEqual(['company-1']);
  });

  it('filtra activos con la condición inversa', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, { status: 'active' });

    const countQuery = calls[0];
    expect(countQuery.sql).toContain('(u.locked_until IS NULL OR u.locked_until <= NOW())');
  });

  it('no numera parámetros en condiciones estáticas', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, { search: 'juan' });

    const countQuery = calls[0];
    // company_id = $1, ILIKE $2 → LIMIT debe empezar en $3.
    expect(countQuery.sql).not.toContain('$2 AND u.deleted_at');
    const dataQuery = calls[1];
    expect(dataQuery.sql).toContain('LIMIT $3 OFFSET $4');
    expect(dataQuery.params).toEqual(['company-1', '%juan%', 20, 0]);
  });

  it('mantiene la numeración más alta igual al largo de los valores', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, { search: 'a', roleId: 'r' });

    for (const call of calls) {
      const max = Math.max(...placeholders(call.sql));
      expect(max).toBeLessThanOrEqual(call.params.length);
    }
  });

  it('acota page y limit a valores seguros', async () => {
    const result = await repository.getMembersByCompany('company-1', 0, 5000);

    expect(result.page).toBe(1);
    // Mismo tope que el DTO (@Max(100)): defensa en profundidad.
    expect(result.limit).toBe(100);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('ordena por nombre ascendente cuando no se pide sort', async () => {
    await repository.getMembersByCompany('company-1', 1, 20);

    // Comportamiento histórico preservado: antes era ORDER BY u.name, u.email.
    expect(calls[1].sql).toContain('ORDER BY u.name ASC, u.name, u.email');
  });

  it('ordena por email descendente con sort explícito', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, {}, { sortBy: 'email', sortDir: 'desc' });

    expect(calls[1].sql).toContain('ORDER BY u.email DESC');
  });

  it('ordena por estado con la expresión de bloqueo', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, {}, { sortBy: 'status', sortDir: 'asc' });

    expect(calls[1].sql).toContain("ORDER BY CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END ASC");
  });

  it('ignora claves de orden desconocidas y cae al fallback', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, {}, { sortBy: 'roles', sortDir: 'desc' });

    // La columna cae al fallback (name), pero la dirección sí se respeta.
    expect(calls[1].sql).toContain('ORDER BY u.name DESC');
  });

  it('neutraliza intentos de inyección en sortBy', async () => {
    await repository.getMembersByCompany('company-1', 1, 20, {}, {
      sortBy: 'u.name; DROP TABLE users--',
      sortDir: 'desc',
    });

    const sql = calls[1].sql;
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('ORDER BY u.name DESC');
  });
});

describe('MemberRepository cross-company (super-admin)', () => {
  function createRunnerStub(rowsByMatcher: Array<{ match: RegExp; rows: any[] }>) {
    const queries: Array<{ sql: string; params: any[] }> = [];
    const query = vi.fn(async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      const hit = rowsByMatcher.find((r) => r.match.test(sql));
      return hit ? hit.rows : [];
    });
    const runner = {
      connect: vi.fn(async () => {}),
      startTransaction: vi.fn(async () => {}),
      query,
      commitTransaction: vi.fn(async () => {}),
      rollbackTransaction: vi.fn(async () => {}),
      release: vi.fn(async () => {}),
    };
    const dataSource = {
      query,
      createQueryRunner: () => runner,
    };
    return { dataSource, queries, runner };
  }

  it('findInvalidRoleIds acepta globales y de la empresa, rechaza ajenos', async () => {
    const { dataSource, queries } = createRunnerStub([
      { match: /FROM roles/, rows: [{ id: 'r-global' }, { id: 'r-mine' }] },
    ]);
    const repo = new MemberRepository(dataSource as any);

    const invalid = await repo.findInvalidRoleIds(['r-global', 'r-mine', 'r-foreign'], 'company-1');

    expect(invalid).toEqual(['r-foreign']);
    const sql = queries[0].sql;
    expect(sql).toContain('company_id IS NULL OR company_id = $4');
    expect(queries[0].params).toEqual(['r-global', 'r-mine', 'r-foreign', 'company-1']);
  });

  it('attachExistingUser vincula sin tocar contraseña y rechaza duplicados', async () => {
    const { dataSource, queries, runner } = createRunnerStub([
      { match: /FROM user_contexts WHERE user_id/, rows: [] },
    ]);
    const repo = new MemberRepository(dataSource as any);

    const result = await repo.attachExistingUser('company-9', 'user-7', ['r-1']);

    expect(result).toEqual({ id: 'user-7', roleIds: ['r-1'], isNewUser: false });
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    const insert = queries.find((q) => q.sql.includes('INSERT INTO user_contexts'));
    expect(insert?.params.slice(0, 2)).toEqual(['user-7', 'company-9']);
  });

  it('attachExistingUser hace rollback y lanza 409 si ya es miembro', async () => {
    const { dataSource, runner } = createRunnerStub([
      { match: /FROM user_contexts WHERE user_id/, rows: [{ '1': 1 }] },
    ]);
    const repo = new MemberRepository(dataSource as any);

    await expect(repo.attachExistingUser('company-9', 'user-7', ['r-1'])).rejects.toThrow(
      'El usuario ya es miembro de esta empresa',
    );
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });

  it('getMemberCompanies agrupa roles por empresa del usuario', async () => {
    const { dataSource, queries } = createRunnerStub([
      { match: /FROM companies c/, rows: [{ id: 'c-1', name: 'Acme', slug: 'acme', roles: ['Owner'] }] },
    ]);
    const repo = new MemberRepository(dataSource as any);

    const result = await repo.getMemberCompanies('user-7');

    expect(result).toEqual([{ id: 'c-1', name: 'Acme', slug: 'acme', roles: ['Owner'] }]);
    expect(queries[0].params).toEqual(['user-7']);
    expect(queries[0].sql).toContain('uc.user_id = $1');
  });

  it('searchUsers limita y pagina con ILIKE en nombre/email', async () => {
    const { dataSource, queries } = createRunnerStub([
      { match: /FROM users/, rows: [{ id: 'u-1', name: 'Juan', email: 'juan@x.co' }] },
    ]);
    const repo = new MemberRepository(dataSource as any);

    const result = await repo.searchUsers('ju', 99);

    expect(result).toHaveLength(1);
    expect(queries[0].params).toEqual(['%ju%', 20]);
    expect(queries[0].sql).toContain('name ILIKE $1 OR email ILIKE $1');
  });
});
