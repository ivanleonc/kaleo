import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogRepository } from './audit-log.repository.js';
import { encodeAuditCursor } from './audit-cursor.js';

/**
 * Valida el SQL de la paginación por cursor con un DataSource falso que captura
 * las consultas. Es donde más fácil se cuela una numeración de placeholders
 * equivocada, y `audit_logs` está particionada: un índice mal correlacionado
 * rompe la consulta en cuanto hay más de una partición con datos.
 */
function createDataSourceStub(rows: any[] = []) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const dataSource = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return rows;
    }),
  };
  return { dataSource, calls };
}

function placeholders(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

const LAST_ROW = {
  id: 'ffffffff-0000-4000-8000-000000000000',
  created_at: new Date('2026-06-01T08:15:45.123Z'),
};

describe('AuditLogRepository.findFiltered', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: AuditLogRepository;

  beforeEach(() => {
    const stub = createDataSourceStub();
    calls = stub.calls;
    repository = new AuditLogRepository(stub.dataSource as any);
  });

  it('ordena por created_at e id para desempatar', async () => {
    await repository.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(calls[0].sql).toContain('ORDER BY al.created_at DESC, al.id DESC');
  });

  it('pide una fila extra para detectar página siguiente sin COUNT', async () => {
    await repository.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(calls[0].sql).not.toContain('COUNT');
    expect(calls[0].sql).toContain('LIMIT $3');
    expect(calls[0].params[2]).toBe(21);
  });

  it('usa la comparación por tuplas al recibir un cursor', async () => {
    const cursor = encodeAuditCursor({ created_at: '2026-06-01T08:15:45.123Z', id: LAST_ROW.id });
    await repository.findFiltered({ companyId: 'company-1', limit: 20, cursor });

    const { sql, params } = calls[0];
    expect(sql).toContain('(al.created_at, al.id) < ($3, $4)');
    expect(params[2]).toBe('2026-06-01T08:15:45.123Z');
    expect(params[3]).toBe(LAST_ROW.id);
    expect(sql).toContain('LIMIT $5');
    expect(params[4]).toBe(21);
  });

  it('omite la condición de cursor cuando no se envía', async () => {
    await repository.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(calls[0].sql).not.toContain('al.id) <');
  });

  it('numera los placeholders sin huecos ni repeticiones', async () => {
    const cursor = encodeAuditCursor({ created_at: '2026-06-01T08:15:45.123Z', id: LAST_ROW.id });
    await repository.findFiltered({
      companyId: 'company-1',
      limit: 20,
      cursor,
      entityType: 'User',
      action: 'CREATE',
      userId: 'user-1',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.000Z',
    });

    const numbers = placeholders(calls[0].sql);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(calls[0].params).toHaveLength(9);
  });

  it('marca hasNext y devuelve cursor cuando sobra la fila extra', async () => {
    const stub = createDataSourceStub([
      { id: 'a1', created_at: new Date('2026-06-02T00:00:00.000Z') },
      { id: 'b2', created_at: new Date('2026-06-01T00:00:00.000Z') },
    ]);
    const repo = new AuditLogRepository(stub.dataSource as any);

    const result = await repo.findFiltered({ companyId: 'company-1', limit: 1 });

    expect(result.hasNext).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('a1');
    // El cursor apunta a la última fila ENTREGADA, no a la fila sobrante: la
    // siguiente página debe empezar justo después de lo que el cliente vio.
    expect(result.nextCursor).toBe(
      encodeAuditCursor({ created_at: '2026-06-02T00:00:00.000Z', id: 'a1' }),
    );
  });

  it('no devuelve cursor en la última página', async () => {
    const stub = createDataSourceStub([{ id: 'a1', created_at: new Date('2026-06-01T00:00:00.000Z') }]);
    const repo = new AuditLogRepository(stub.dataSource as any);

    const result = await repo.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('devuelve página vacía sin cursor cuando no hay filas', async () => {
    const result = await repository.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(result.data).toEqual([]);
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('aplica la ventana de 30 días por defecto', async () => {
    await repository.findFiltered({ companyId: 'company-1', limit: 20 });

    expect(calls[0].sql).toContain('al.created_at >= $2');
    const from = new Date(calls[0].params[1]);
    const diffDays = (Date.now() - from.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });
});
