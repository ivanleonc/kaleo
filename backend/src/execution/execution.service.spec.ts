import { describe, expect, it, vi } from 'vitest';
import { ExecutionService } from './execution.service.js';

const CONTRACT = {
  id: 'contract-1',
  company_id: 'company-1',
  project_id: 'project-1',
  party_id: null,
  party_name: null,
  contract_type: 'obra' as const,
  code: 'CT-001',
  name: 'Contrato principal',
  amount: 0,
  currency_code: 'COP',
  start_date: null,
  end_date: null,
  status: 'draft' as const,
  notes: null,
  created_at: '',
  updated_at: '',
  deleted_at: null,
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    findContract: vi.fn(async () => CONTRACT),
    createContract: vi.fn(async () => CONTRACT),
    updateContract: vi.fn(async () => CONTRACT),
    partyExists: vi.fn(async () => true),
    currencyExists: vi.fn(async () => true),
    findWarehouse: vi.fn(async () => ({ id: 'warehouse-1' })),
    resourceExists: vi.fn(async () => true),
    createMovement: vi.fn(async () => ({ id: 'movement-1' })),
    getPurchaseOrder: vi.fn(async () => ({ id: 'po-1', status: 'received', lines: [] })),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new ExecutionService(repository, entitlements), repository, entitlements };
}

describe('ExecutionService', () => {
  it('crea contratos normalizando la moneda', async () => {
    const { service, repository } = createService();

    await service.createContract('company-1', 'user-1', 'project-1', {
      code: 'CT-001',
      name: 'Contrato principal',
      currencyCode: 'cop',
    });

    expect(repository.createContract).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'project-1',
      expect.objectContaining({ currencyCode: 'COP' }),
    );
  });

  it('rechaza fechas invertidas y monedas inexistentes', async () => {
    const { service } = createService({ currencyExists: vi.fn(async () => false) });

    await expect(
      service.createContract('company-1', 'user-1', 'project-1', {
        code: 'CT-001',
        name: 'Contrato',
        currencyCode: 'COP',
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      }),
    ).rejects.toThrow('fecha final');

    await expect(
      service.createContract('company-1', 'user-1', 'project-1', {
        code: 'CT-001',
        name: 'Contrato',
        currencyCode: 'COP',
      }),
    ).rejects.toThrow('moneda');
  });

  it('valida cantidad y recurso en movimientos de almacén', async () => {
    const { service } = createService();

    await expect(
      service.createMovement('company-1', 'user-1', 'warehouse-1', {
        resourceId: 'resource-1',
        quantity: 0,
      }),
    ).rejects.toThrow('mayor a cero');

    const missing = createService({ resourceExists: vi.fn(async () => false) });
    await expect(
      missing.service.createMovement('company-1', 'user-1', 'warehouse-1', {
        resourceId: 'missing',
        quantity: 1,
      }),
    ).rejects.toThrow('recurso');
  });

  it('no permite editar órdenes cerradas', async () => {
    const { service } = createService();

    await expect(
      service.updatePurchaseOrder('company-1', 'po-1', { notes: 'x' }),
    ).rejects.toThrow('cerrada');
  });
});
