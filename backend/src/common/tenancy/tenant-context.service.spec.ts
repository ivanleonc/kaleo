import { describe, expect, it } from 'vitest';
import { TenantContextService } from './tenant-context.service.js';

describe('TenantContextService', () => {
  it('expone el store dentro de run', () => {
    const context = new TenantContextService();

    context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
      expect(context.get()?.requestId).toBe('req-1');
      expect(context.getCompanyId()).toBeUndefined();
    });
  });

  it('setCompany y setUser actualizan el store', () => {
    const context = new TenantContextService();

    context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
      context.setCompany('company-1', 'user-1', false);
      expect(context.requireCompanyId()).toBe('company-1');
      expect(context.get()?.userId).toBe('user-1');
      expect(context.get()?.isSuperAdmin).toBe(false);
    });
  });

  it('requireCompanyId falla sin companyId', () => {
    const context = new TenantContextService();

    context.run({ requestId: 'req-1', isSuperAdmin: false }, () => {
      expect(() => context.requireCompanyId()).toThrow(/TenantContext sin companyId/);
    });
  });

  it('fuera de una request no lanza al setear', () => {
    const context = new TenantContextService();

    expect(() => context.setCompany('company-1')).not.toThrow();
    expect(() => context.setUser('user-1')).not.toThrow();
    expect(context.getCompanyId()).toBeUndefined();
  });

  it('aísla contextos concurrentes', async () => {
    const context = new TenantContextService();

    const a = context.run({ requestId: 'a', isSuperAdmin: false }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return context.getCompanyId();
    });
    const b = context.run({ requestId: 'b', isSuperAdmin: false }, async () => {
      context.setCompany('company-b');
      return context.getCompanyId();
    });

    await expect(b).resolves.toBe('company-b');
    await expect(a).resolves.toBeUndefined();
  });
});
