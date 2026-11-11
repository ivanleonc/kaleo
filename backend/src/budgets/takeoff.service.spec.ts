import { describe, expect, it, vi } from 'vitest';
import { TakeoffService, computeQuantity } from './takeoff.service.js';

const SHEET = {
  id: 'sheet-1',
  company_id: 'company-1',
  project_id: 'project-1',
  budget_item_id: 'item-1',
  budget_item_name: 'Muro',
  name: 'Muros planta 1',
  description: null,
  status: 'draft' as const,
  created_at: '',
  updated_at: '',
  deleted_at: null,
  lines_count: 2,
  total_quantity: 15,
  lines: [
    {
      id: 'line-1',
      company_id: 'company-1',
      sheet_id: 'sheet-1',
      description: 'Muro A',
      unit_id: 'unit-1',
      unit_code: 'm2',
      unit_name: 'Metro cuadrado',
      parts: 1,
      length: 10,
      width: 1,
      height: 0,
      quantity: 10,
      notes: null,
      created_at: '',
    },
    {
      id: 'line-2',
      company_id: 'company-1',
      sheet_id: 'sheet-1',
      description: 'Muro B',
      unit_id: 'unit-1',
      unit_code: 'm2',
      unit_name: 'Metro cuadrado',
      parts: 1,
      length: 5,
      width: 1,
      height: 0,
      quantity: 5,
      notes: null,
      created_at: '',
    },
  ],
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    getDetail: vi.fn(async () => SHEET),
    updateSheet: vi.fn(async () => SHEET),
    ...overrides,
  } as any;
  const budgetsRepository = {
    findItemById: vi.fn(async () => ({
      id: 'item-1',
      budget_id: 'budget-1',
      item_type: 'activity',
      unit_id: 'unit-1',
    })),
    ...overrides,
  } as any;
  const budgets = { updateItem: vi.fn(async () => ({})) } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return {
    service: new TakeoffService(repository, budgetsRepository, budgets, entitlements),
    repository,
    budgetsRepository,
    budgets,
    entitlements,
  };
}

describe('computeQuantity', () => {
  it('multiplica piezas por dimensiones mayores a cero', () => {
    expect(computeQuantity({ parts: 2, length: 3, width: 1.5, height: 2 })).toBe(18);
  });

  it('respeta la cantidad explícita', () => {
    expect(computeQuantity({ parts: 2, length: 3, quantity: 7 })).toBe(7);
  });

  it('usa piezas cuando no hay dimensiones', () => {
    expect(computeQuantity({ parts: 4 })).toBe(4);
  });
});

describe('TakeoffService', () => {
  it('aplica la suma de líneas con la misma unidad de la actividad', async () => {
    const { service, budgets, repository } = createService();

    await service.applyToBudgetItem('company-1', 'sheet-1');

    expect(budgets.updateItem).toHaveBeenCalledWith('company-1', 'budget-1', 'item-1', {
      quantity: 15,
    });
    expect(repository.updateSheet).toHaveBeenCalledWith('company-1', 'sheet-1', {
      status: 'confirmed',
    });
  });

  it('rechaza aplicar si ninguna línea coincide con la unidad', async () => {
    const { service } = createService({
      findItemById: vi.fn(async () => ({
        id: 'item-1',
        budget_id: 'budget-1',
        item_type: 'activity',
        unit_id: 'unit-other',
      })),
    });

    await expect(service.applyToBudgetItem('company-1', 'sheet-1')).rejects.toThrow(
      'Ninguna línea coincide',
    );
  });
});
