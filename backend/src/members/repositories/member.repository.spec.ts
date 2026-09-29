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
    expect(result.limit).toBe(200);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});
