import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EntitlementService } from './entitlement.service.js';
import type { EntitlementLimit } from './entitlement.types.js';

function createService(overrides: Partial<Record<string, any>> = {}) {
  const repository = {
    getActiveSubscription: vi.fn(async () => ({
      planId: 'plan-1',
      plan: {
        id: 'sub-1',
        code: 'core',
        name: 'Core',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: null,
      },
    })),
    getPlanModuleCodes: vi.fn(async () => ['core.users']),
    getPlanLimits: vi.fn(async () => [] as EntitlementLimit[]),
    getOverrides: vi.fn(async () => [] as EntitlementLimit[]),
    getUsage: vi.fn(async () => []),
    getUsageCounter: vi.fn(async () => 0),
    addUsage: vi.fn(async () => 1),
    ...overrides,
  } as any;

  return { service: new EntitlementService(repository), repository };
}

describe('EntitlementService', () => {
  it('devuelve snapshot del plan activo', async () => {
    const { service } = createService();
    const snapshot = await service.getSnapshot('company-1');

    expect(snapshot.plan?.code).toBe('core');
    expect(snapshot.modules).toEqual(['core.users']);
  });

  it('sin suscripción devuelve plan null', async () => {
    const { service } = createService({
      getActiveSubscription: vi.fn(async () => null),
    });
    const snapshot = await service.getSnapshot('company-1');

    expect(snapshot.plan).toBeNull();
    expect(snapshot.modules).toEqual([]);
  });

  it('los core siempre están incluidos', async () => {
    const { service } = createService({
      getActiveSubscription: vi.fn(async () => null),
    });
    await expect(service.isModuleIncluded('company-1', 'core.users')).resolves.toBe(true);
  });

  it('un pack requiere estar en el plan', async () => {
    const { service } = createService();
    await expect(
      service.isModuleIncluded('company-1', 'construction.projects'),
    ).resolves.toBe(false);
  });

  it('aplica override sobre el límite del plan', async () => {
    const { service } = createService({
      getOverrides: vi.fn(async () => [
        {
          moduleCode: 'construction.projects',
          featureCode: 'projects.create',
          limitValue: 5,
          period: 'month',
          isHard: true,
        },
      ]),
      getUsageCounter: vi.fn(async () => 5),
    });

    await expect(
      service.assertWithinLimit('company-1', 'construction.projects', 'projects.create'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('un límite blando no bloquea', async () => {
    const { service } = createService({
      getOverrides: vi.fn(async () => [
        {
          moduleCode: 'construction.projects',
          featureCode: 'projects.create',
          limitValue: 1,
          period: 'month',
          isHard: false,
        },
      ]),
      getUsageCounter: vi.fn(async () => 10),
    });

    await expect(
      service.assertWithinLimit('company-1', 'construction.projects', 'projects.create'),
    ).resolves.toBeUndefined();
  });

  it('consume usa el período del límite', async () => {
    const { service, repository } = createService({
      getPlanLimits: vi.fn(async () => [
        {
          moduleCode: 'construction.projects',
          featureCode: 'projects.create',
          limitValue: 10,
          period: 'year',
          isHard: true,
        },
      ]),
    });

    await service.consume('company-1', 'construction.projects', 'projects.create');

    expect(repository.addUsage).toHaveBeenCalledWith(
      'company-1',
      'construction.projects',
      'projects.create',
      expect.stringMatching(/^\d{4}-01-01$/),
      1,
    );
  });
});
