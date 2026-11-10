import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InvitationsRepository } from './invitations.repository.js';

vi.mock('../common/tenancy/tenant-transaction.js', () => ({
  withTenantTransaction: async (dataSource: any, _context: any, fn: any) => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await fn(runner);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  },
}));

function createContext(companyId = 'company-1') {
  return {
    requireCompanyId: () => companyId,
    getUserId: () => 'user-1',
    get: () => ({ requestId: 'req-1', userId: 'user-1', isSuperAdmin: false }),
    setCompany: vi.fn(),
    setUser: vi.fn(),
  } as any;
}

function createRunnerStub(handlers: Array<{ match: RegExp; rows: any[] }>) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    const hit = handlers.find((h) => h.match.test(sql));
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
  const dataSource = { query, createQueryRunner: () => runner };
  return { dataSource, queries, runner };
}

describe('InvitationsRepository', () => {
  it('create revoca la pendiente anterior e inserta invitación y roles', async () => {
    const { dataSource, queries } = createRunnerStub([
      { match: /UPDATE invitations[\s\S]*status = 'revoked'/, rows: [] },
      { match: /INSERT INTO invitations/, rows: [{ id: 'inv-1', email: 'a@b.com', expires_at: '2026-12-01T00:00:00Z' }] },
      { match: /INSERT INTO invitation_roles/, rows: [] },
    ]);
    const repository = new InvitationsRepository(dataSource as any, createContext());

    const result = await repository.create({
      companyId: 'company-1',
      invitedBy: 'user-1',
      email: 'a@b.com',
      tokenHash: 'hash',
      expiresAt: new Date('2026-12-01T00:00:00Z'),
      roleIds: ['role-1', 'role-2'],
    });

    expect(result.id).toBe('inv-1');
    expect(queries[0]!.sql).toContain("status = 'revoked'");
    expect(queries[1]!.params).toContain('hash');
    expect(queries[2]!.params).toEqual(['company-1', 'inv-1', 'role-1', 'role-2']);
  });

  it('findPendingByTokenHash solo busca pendientes', async () => {
    const { dataSource, queries } = createRunnerStub([
      {
        match: /FROM invitations i/,
        rows: [{
          id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'a@b.com',
          name: null, expires_at: '2026-12-01T00:00:00Z', role_ids: ['r-1'],
        }],
      },
    ]);
    const repository = new InvitationsRepository(dataSource as any, createContext());

    const result = await repository.findPendingByTokenHash('hash');

    expect(result?.company_name).toBe('Acme');
    expect(queries[0]!.params).toEqual(['hash']);
    expect(queries[0]!.sql).toContain("status = 'pending'");
  });

  it('acceptForNewUser crea usuario, membership y marca la invitación', async () => {
    const { dataSource, queries, runner } = createRunnerStub([
      { match: /UPDATE invitations[\s\S]*status = 'accepted'/, rows: [{ id: 'inv-1' }] },
      { match: /INSERT INTO users/, rows: [{ id: 'user-1', email: 'a@b.com', name: 'Ana' }] },
      { match: /INSERT INTO memberships/, rows: [{ id: 'm-1' }] },
      { match: /SET accepted_by/, rows: [] },
    ]);
    const repository = new InvitationsRepository(dataSource as any, createContext());

    const result = await repository.acceptForNewUser({
      invitationId: 'inv-1',
      companyId: 'company-1',
      email: 'a@b.com',
      name: 'Ana',
      passwordHash: 'hash',
      roleIds: ['role-1'],
    });

    expect(result.id).toBe('user-1');
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(queries.some((q) => q.sql.includes('INSERT INTO memberships'))).toBe(true);
  });

  it('acceptForNewUser falla si la invitación ya no está pendiente', async () => {
    const { dataSource, runner } = createRunnerStub([
      { match: /UPDATE invitations[\s\S]*status = 'accepted'/, rows: [] },
    ]);
    const repository = new InvitationsRepository(dataSource as any, createContext());

    await expect(repository.acceptForNewUser({
      invitationId: 'inv-1',
      companyId: 'company-1',
      email: 'a@b.com',
      name: 'Ana',
      passwordHash: 'hash',
      roleIds: [],
    })).rejects.toBeInstanceOf(ConflictException);

    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });

  it('revoke devuelve false si no había pendiente', async () => {
    const { dataSource } = createRunnerStub([{ match: /UPDATE invitations/, rows: [] }]);
    const repository = new InvitationsRepository(dataSource as any, createContext());

    await expect(repository.revoke('company-1', 'inv-1')).resolves.toBe(false);
  });
});
