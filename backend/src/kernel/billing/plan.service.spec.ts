import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PlanService } from './plan.service.js';
import type { PlanRecord } from './entitlement.types.js';

function plan(overrides: Partial<PlanRecord> = {}): PlanRecord {
  return {
    id: 'plan-1',
    code: 'construction',
    name: 'Construcción',
    trialDays: 14,
    billingInterval: 'month',
    price: 0,
    currencyCode: 'COP',
    isActive: true,
    modules: ['core.users'],
    limits: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createService() {
  const repository = {
    listPlans: vi.fn(async () => [plan()]),
    findPlanById: vi.fn(async () => plan()),
    findPlanByCode: vi.fn(async () => plan()),
    createPlan: vi.fn(async (input) => plan({ ...input, id: 'plan-new' })),
    updatePlan: vi.fn(async () => plan()),
    replaceModules: vi.fn(async () => {}),
    replaceLimits: vi.fn(async () => {}),
    findMissingModuleCodes: vi.fn(async () => []),
    getCoreModuleCodes: vi.fn(async () => ['core.users', 'core.branches']),
    getCompanySubscription: vi.fn(async () => null),
    assignSubscription: vi.fn(async (input) => ({
      id: 'sub-1',
      companyId: input.companyId,
      companyName: 'Acme',
      planId: input.planId,
      planCode: 'construction',
      planName: 'Construcción',
      status: input.status,
      currentPeriodStart: input.currentPeriodStart.toISOString(),
      currentPeriodEnd: input.currentPeriodEnd?.toISOString() ?? null,
      provider: input.provider ?? null,
      externalId: input.externalId ?? null,
    })),
  } as any;

  return { service: new PlanService(repository), repository };
}

describe('PlanService', () => {
  it('crea un plan incluyendo siempre los módulos core', async () => {
    const { service, repository } = createService();

    await service.create({ code: 'construction', name: 'Construcción' });

    expect(repository.replaceModules).toHaveBeenCalledWith('plan-new', [
      'core.branches',
      'core.users',
    ]);
  });

  it('rechaza límites de módulos fuera del plan', async () => {
    const { service } = createService();

    await expect(
      service.create({
        code: 'construction',
        name: 'Construcción',
        modules: ['construction.projects'],
        limits: [
          {
            moduleCode: 'crm.accounts',
            featureCode: 'max',
            limitValue: 1,
            period: 'month',
            isHard: true,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calcula el fin del trial con los días por defecto del plan', async () => {
    const { service, repository } = createService();
    const start = new Date('2026-01-01T00:00:00.000Z');

    await service.assignSubscription('company-1', {
      planCode: 'construction',
      status: 'trialing',
      currentPeriodStart: start.toISOString(),
    });

    const input = repository.assignSubscription.mock.calls[0][0];
    expect(input.status).toBe('trialing');
    expect(input.currentPeriodEnd.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('no asigna un plan inexistente', async () => {
    const { service, repository } = createService();
    repository.findPlanByCode.mockResolvedValue(null);

    await expect(
      service.assignSubscription('company-1', { planCode: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
