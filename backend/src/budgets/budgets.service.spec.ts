import { describe, expect, it, vi } from 'vitest';
import { BudgetsService } from './budgets.service.js';

const BUDGET = {
  id: 'budget-1',
  company_id: 'company-1',
  project_id: 'project-1',
  code: 'PRES-PRY-001',
  name: 'Presupuesto Torre',
  version: 1,
  label: null,
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
    findLatestVersion: vi.fn(async () => BUDGET),
    listVersions: vi.fn(async () => []),
    createVersion: vi.fn(async () => BUDGET),
    updateLabel: vi.fn(async () => true),
    listMaterials: vi.fn(async () => []),
    findUnitIdByCode: vi.fn(async () => 'unit-1'),
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
      findLatestVersion: vi.fn(async () => null),
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

  it('versiona solo presupuestos aprobados', async () => {
    const { service, repository } = createService({
      getDetail: vi.fn(async () => ({ ...BUDGET, status: 'approved' })),
    });

    await service.createVersion('company-1', 'user-1', 'budget-1', 'Rev A');

    expect(repository.createVersion).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'budget-1',
      'Rev A',
    );
  });

  it('rechaza versionar un borrador', async () => {
    const { service } = createService();

    await expect(
      service.createVersion('company-1', 'user-1', 'budget-1'),
    ).rejects.toThrow('Solo puedes versionar');
  });

  it('compara dos versiones del mismo proyecto', async () => {
    const base = {
      ...BUDGET,
      id: 'budget-1',
      version: 1,
      total: 100,
      items: [{ ...ITEM, code: '01', partial_amount: 100, quantity: 1 }],
    };
    const target = {
      ...BUDGET,
      id: 'budget-2',
      version: 2,
      total: 150,
      items: [
        { ...ITEM, code: '01', partial_amount: 120, quantity: 2 },
        { ...ITEM, id: 'item-2', code: '02', partial_amount: 30, quantity: 1 },
      ],
    };
    const { service } = createService({
      getDetail: vi
        .fn()
        .mockResolvedValueOnce(base)
        .mockResolvedValueOnce(target),
    });

    const result = await service.compare('company-1', 'budget-1', 'budget-2');

    expect(result.rows).toHaveLength(2);
    expect(result.rows.find((row) => row.code === '01')?.change).toBe('modified');
    expect(result.rows.find((row) => row.code === '02')?.change).toBe('added');
    expect(result.totals).toEqual({ base_total: 100, target_total: 150, delta: 50 });
  });

  it('lista el total de insumos del presupuesto', async () => {
    const material = {
      resource_code: 'CEM',
      resource_name: 'Cemento',
      component_type: 'material',
      unit_code: 'kg',
      currency_code: 'COP',
      quantity: 10,
      unit_cost: 500,
      total_cost: 5000,
      apu_count: 2,
    };
    const { service, repository } = createService({
      listMaterials: vi.fn(async () => [material]),
    });

    await expect(service.getMaterials('company-1', 'budget-1')).resolves.toEqual([material]);
    expect(repository.listMaterials).toHaveBeenCalledWith('company-1', 'budget-1');
  });

  it('importa un presupuesto creando capítulo y actividades', async () => {
    const { service, repository } = createService();

    const result = await service.importBudget('company-1', 'user-1', 'project-1', [
      {
        chapterCode: '01',
        chapterName: 'Preliminares',
        code: '01.01',
        name: 'Cerramiento',
        unitCode: 'm2',
        quantity: 12,
        unitPrice: 5000,
      },
    ]);

    expect(repository.createItem).toHaveBeenCalledTimes(2);
    expect(repository.createItem).toHaveBeenLastCalledWith(
      'company-1',
      'budget-1',
      expect.objectContaining({
        code: '01.01',
        name: 'Cerramiento',
        itemType: 'activity',
        quantity: 12,
        unitPrice: 5000,
      }),
    );
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
  });
});
