import { describe, expect, it, vi } from 'vitest';
import { BudgetsService } from './budgets.service.js';

const BUDGET = {
  id: 'budget-1',
  company_id: 'company-1',
  project_id: 'project-1',
  code: 'PRES-PRY-001',
  name: 'Presupuesto Torre',
  version: 1,
  status: 'draft',
  currency_code: 'COP',
  apu_base_id: null,
  apu_base_name: null,
  indirect_pct: 10,
  indirect_fixed: 0,
  subtotal: 0,
  indirect_total: 0,
  total: 0,
  approved_by: null,
  approved_at: null,
  created_by: 'user-1',
  created_at: '',
  updated_at: '',
  deleted_at: null,
  items_count: 0,
  project_code: 'PRY-001',
  project_name: 'Torre',
  items: [],
};

const ITEM = {
  id: 'item-1',
  company_id: 'company-1',
  budget_id: 'budget-1',
  parent_id: null,
  code: 'muro',
  name: 'Muro',
  item_type: 'activity',
  unit_id: 'unit-1',
  unit_code: 'm2',
  unit_name: 'Metro cuadrado',
  quantity: 0,
  unit_price: 100,
  partial_amount: 0,
  apu_id: 'apu-1',
  apu_version_id: 'version-1',
  assigned_membership_id: null,
  assigned_user_name: null,
  sort_order: 0,
  notes: null,
  created_at: '',
  updated_at: '',
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    findByProject: vi.fn(async () => BUDGET),
    findById: vi.fn(async () => BUDGET),
    getDetail: vi.fn(async () => BUDGET),
    create: vi.fn(async () => BUDGET),
    update: vi.fn(async () => BUDGET),
    listItems: vi.fn(async () => []),
    createItem: vi.fn(async () => ITEM),
    updateItem: vi.fn(async () => ITEM),
    deleteItem: vi.fn(async () => true),
    updateCalculations: vi.fn(async () => {}),
    insertApproval: vi.fn(async () => {}),
    unitExists: vi.fn(async () => true),
    membershipExists: vi.fn(async () => true),
    ...overrides,
  } as any;
  const projects = {
    get: vi.fn(async () => ({
      id: 'project-1',
      code: 'PRY-001',
      name: 'Torre',
      currency_code: 'COP',
    })),
  } as any;
  const estimating = {
    listApuBases: vi.fn(async () => [{ id: 'base-1', name: 'Base' }]),
    getApu: vi.fn(async () => ({
      id: 'apu-1',
      code: 'muro',
      name: 'Muro',
      unit_id: 'unit-1',
      unit_cost: 100,
      current_version_id: 'version-1',
    })),
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return {
    service: new BudgetsService(repository, projects, estimating, entitlements),
    repository,
    projects,
    estimating,
    entitlements,
  };
}

describe('BudgetsService', () => {
  it('crea el presupuesto del proyecto con su moneda y código', async () => {
    const { service, repository } = createService({
      findByProject: vi.fn(async () => null),
    });

    await service.createBudget('company-1', 'user-1', 'project-1');

    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'project-1',
      expect.objectContaining({
        code: 'PRES-PRY-001',
        currencyCode: 'COP',
      }),
    );
  });

  it('rechaza un segundo presupuesto del mismo proyecto', async () => {
    const { service } = createService();

    await expect(
      service.createBudget('company-1', 'user-1', 'project-1'),
    ).rejects.toThrow('ya tiene un presupuesto');
  });

  it('agrega actividades desde APUs con costo unitario y versión', async () => {
    const { service, repository } = createService();

    await service.addFromApus('company-1', 'budget-1', {
      apuIds: ['apu-1'],
    });

    expect(repository.createItem).toHaveBeenCalledWith(
      'company-1',
      'budget-1',
      expect.objectContaining({
        code: 'muro',
        itemType: 'activity',
        unitPrice: 100,
        apuId: 'apu-1',
        apuVersionId: 'version-1',
      }),
    );
    expect(repository.updateCalculations).toHaveBeenCalled();
  });

  it('bloquea cambios si el presupuesto está aprobado', async () => {
    const approved = { ...BUDGET, status: 'approved' };
    const { service } = createService({ getDetail: vi.fn(async () => approved) });

    await expect(
      service.addItem('company-1', 'budget-1', {
        name: 'Nuevo',
        itemType: 'chapter',
      }),
    ).rejects.toThrow('bloqueado');
  });

  it('aprueba y guarda snapshot del presupuesto', async () => {
    const { service, repository } = createService();

    await service.approveBudget('company-1', 'user-1', 'budget-1');

    expect(repository.update).toHaveBeenCalledWith(
      'company-1',
      'budget-1',
      expect.objectContaining({ status: 'approved', approvedBy: 'user-1' }),
    );
    expect(repository.insertApproval).toHaveBeenCalled();
  });
});
