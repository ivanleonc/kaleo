import { describe, expect, it, vi } from 'vitest';
import { TenantContextService } from './tenant-context.service.js';
import { withTenantTransaction } from './tenant-transaction.js';

function createDataSourceStub() {
  const runner = {
    connect: vi.fn(async () => {}),
    startTransaction: vi.fn(async () => {}),
    query: vi.fn(async () => []),
    commitTransaction: vi.fn(async () => {}),
    rollbackTransaction: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
  };
  const dataSource = { createQueryRunner: () => runner };
  return { dataSource, runner };
}

describe('withTenantTransaction', () => {
  it('setea app.company_id, ejecuta y commitea', async () => {
    const context = new TenantContextService();
    const { dataSource, runner } = createDataSourceStub();

    const result = await context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
      context.setCompany('company-1');
      return withTenantTransaction(dataSource as any, context, async (queryRunner) => {
        expect(queryRunner).toBe(runner);
        return 'ok';
      });
    });

    expect(result).toBe('ok');
    expect(runner.query).toHaveBeenCalledWith('SET LOCAL ROLE kaleo_app');
    expect(runner.query).toHaveBeenCalledWith(
      `SELECT set_config('app.company_id', $1, true)`,
      ['company-1'],
    );
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });

  it('setea app.user_id cuando el contexto tiene usuario', async () => {
    const context = new TenantContextService();
    const { dataSource, runner } = createDataSourceStub();

    await context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
      context.setCompany('company-1', 'user-1');
      return withTenantTransaction(dataSource as any, context, async () => 'ok');
    });

    expect(runner.query).toHaveBeenCalledWith(
      `SELECT set_config('app.user_id', $1, true)`,
      ['user-1'],
    );
  });

  it('hace rollback y propaga el error', async () => {
    const context = new TenantContextService();
    const { dataSource, runner } = createDataSourceStub();

    await context.run({ requestId: 'req-1', isSuperAdmin: false }, async () => {
      context.setCompany('company-1');
      await expect(
        withTenantTransaction(dataSource as any, context, async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });

    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });

  it('falla sin companyId y no abre transacción', async () => {
    const context = new TenantContextService();
    const { dataSource, runner } = createDataSourceStub();

    await expect(
      context.run({ requestId: 'req-1', isSuperAdmin: false }, () =>
        withTenantTransaction(dataSource as any, context, async () => 'x'),
      ),
    ).rejects.toThrow(/TenantContext sin companyId/);

    expect(runner.connect).not.toHaveBeenCalled();
    expect(runner.release).not.toHaveBeenCalled();
  });
});
