import { describe, expect, it, vi } from 'vitest';
import { EstimatingService } from './estimating.service.js';

const RESOURCE = {
  id: 'resource-1',
  company_id: 'company-1',
  resource_type: 'material',
  code: 'cem-001',
  name: 'Cemento',
  description: null,
  unit_id: 'unit-1',
  unit_code: 'kg',
  unit_name: 'Kilogramo',
  base_cost: 500,
  currency_code: 'COP',
  catalog_item_id: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  deleted_at: null,
};

const BASE = {
  id: 'base-1',
  company_id: 'company-1',
  code: 'general',
  name: 'Base general',
  description: null,
  source: null,
  is_active: true,
  apus_count: 0,
  created_at: '',
  updated_at: '',
  deleted_at: null,
};

const APU_DETAIL = {
  id: 'apu-1',
  company_id: 'company-1',
  base_id: 'base-1',
  base_name: 'Base general',
  code: 'muro',
  name: 'Muro',
  description: null,
  unit_id: 'unit-1',
  unit_code: 'm2',
  unit_name: 'Metro cuadrado',
  status: 'active',
  current_version_id: 'version-1',
  current_version_number: 1,
  current_version_status: 'draft',
  unit_cost: 100,
  lines_count: 0,
  created_at: '',
  updated_at: '',
  deleted_at: null,
  versions: [
    {
      id: 'version-1',
      company_id: 'company-1',
      apu_id: 'apu-1',
      version_number: 1,
      status: 'draft',
      output_quantity: 1,
      performance: null,
      notes: null,
      approved_by: null,
      approved_at: null,
      created_at: '',
    },
  ],
  lines: [],
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    listResources: vi.fn(async () => [RESOURCE]),
    findResourceById: vi.fn(async () => RESOURCE),
    findResourceByCode: vi.fn(async () => null),
    createResource: vi.fn(async () => RESOURCE),
    updateResource: vi.fn(async () => RESOURCE),
    deleteResource: vi.fn(async () => true),
    unitExists: vi.fn(async () => true),
    currencyExists: vi.fn(async () => true),
    catalogItemExists: vi.fn(async () => true),
    partyExists: vi.fn(async () => true),
    listApuBases: vi.fn(async () => [BASE]),
    findApuBaseById: vi.fn(async () => BASE),
    findApuBaseByCode: vi.fn(async () => null),
    listApus: vi.fn(async () => []),
    findApuById: vi.fn(async () => APU_DETAIL),
    getApuDetail: vi.fn(async () => APU_DETAIL),
    findApuByCode: vi.fn(async () => null),
    createApu: vi.fn(async () => APU_DETAIL),
    updateApu: vi.fn(async () => APU_DETAIL),
    createApuVersion: vi.fn(async () => APU_DETAIL),
    addLine: vi.fn(async () => ({ id: 'line-1' })),
    updateLine: vi.fn(async () => ({ id: 'line-1' })),
    deleteLine: vi.fn(async () => true),
    approveVersion: vi.fn(async () => true),
    listResourcePrices: vi.fn(async () => []),
    addResourcePrice: vi.fn(async () => ({ id: 'price-1' })),
    deleteResourcePrice: vi.fn(async () => true),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new EstimatingService(repository, entitlements), repository, entitlements };
}

describe('EstimatingService', () => {
  it('crea recursos normalizando código y validando unidad/moneda', async () => {
    const { service, repository } = createService();

    await service.createResource('company-1', 'user-1', {
      resourceType: 'material',
      code: ' CEM-001 ',
      name: 'Cemento',
      unitId: 'unit-1',
      baseCost: 500,
      currencyCode: 'cop',
    });

    expect(repository.unitExists).toHaveBeenCalledWith('company-1', 'unit-1');
    expect(repository.currencyExists).toHaveBeenCalledWith('COP');
    expect(repository.createResource).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ code: 'cem-001', currencyCode: 'COP' }),
    );
  });

  it('rechaza códigos de recurso duplicados', async () => {
    const { service } = createService({ findResourceByCode: vi.fn(async () => RESOURCE) });

    await expect(
      service.createResource('company-1', 'user-1', {
        resourceType: 'material',
        code: 'cem-001',
        name: 'Cemento',
        unitId: 'unit-1',
        baseCost: 500,
        currencyCode: 'COP',
      }),
    ).rejects.toThrow('Ya existe un recurso');
  });

  it('no permite agregar insumos a un APU aprobado', async () => {
    const approved = {
      ...APU_DETAIL,
      versions: [{ ...APU_DETAIL.versions[0], status: 'approved' }],
    };
    const { service } = createService({ getApuDetail: vi.fn(async () => approved) });

    await expect(
      service.addApuLine('company-1', 'apu-1', { resourceId: 'resource-1', quantity: 1 }),
    ).rejects.toThrow('bloqueada');
  });

  it('crea una nueva versión y aprueba el APU', async () => {
    const { service, repository } = createService();

    await service.createApuVersion('company-1', 'user-1', 'apu-1');
    await service.approveApu('company-1', 'user-1', 'apu-1');

    expect(repository.createApuVersion).toHaveBeenCalled();
    expect(repository.approveVersion).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'version-1',
    );
  });
});
