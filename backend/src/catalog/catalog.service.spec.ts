import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from './catalog.service.js';

const UNIT = {
  id: 'unit-1',
  company_id: 'company-1',
  code: 'm2',
  name: 'Metro cuadrado',
  kind: 'area',
  precision: 4,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  is_global: false,
  conversions_count: 0,
};

const GLOBAL_UNIT = {
  ...UNIT,
  id: 'unit-global',
  company_id: null,
  code: 'm',
  name: 'Metro',
  kind: 'length',
  is_global: true,
};

const TAX = {
  id: 'tax-1',
  company_id: 'company-1',
  code: 'iva-19',
  name: 'IVA 19%',
  rate: 19,
  country_code: 'CO',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    listCurrencies: vi.fn(async () => []),
    listUnits: vi.fn(async () => []),
    findUnitById: vi.fn(async (_companyId, id) => (id === GLOBAL_UNIT.id ? GLOBAL_UNIT : UNIT)),
    findUnitByCode: vi.fn(async () => null),
    createUnit: vi.fn(async () => UNIT),
    updateUnit: vi.fn(async () => UNIT),
    deleteUnit: vi.fn(async () => true),
    listConversions: vi.fn(async () => []),
    findConversion: vi.fn(async () => null),
    createConversion: vi.fn(async () => ({ id: 'conversion-1', factor: 100 })),
    deleteConversion: vi.fn(async () => true),
    listTaxRates: vi.fn(async () => []),
    findTaxRateById: vi.fn(async () => TAX),
    findTaxRateByCode: vi.fn(async () => null),
    createTaxRate: vi.fn(async () => TAX),
    updateTaxRate: vi.fn(async () => TAX),
    deleteTaxRate: vi.fn(async () => true),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new CatalogService(repository, entitlements), repository, entitlements };
}

describe('CatalogService', () => {
  it('crea una unidad normalizando el código y validando duplicados', async () => {
    const { service, repository, entitlements } = createService();

    await service.createUnit('company-1', {
      code: ' M2 ',
      name: 'Metro cuadrado',
      kind: 'area',
      precision: 4,
    });

    expect(entitlements.assertWritableModule).toHaveBeenCalledWith(
      'company-1',
      'shared.catalog',
    );
    expect(repository.findUnitByCode).toHaveBeenCalledWith('company-1', 'm2');
    expect(repository.createUnit).toHaveBeenCalledWith('company-1', {
      code: 'm2',
      name: 'Metro cuadrado',
      kind: 'area',
      precision: 4,
      isActive: undefined,
    });
  });

  it('rechaza códigos de unidad duplicados', async () => {
    const { service } = createService({ findUnitByCode: vi.fn(async () => UNIT) });

    await expect(
      service.createUnit('company-1', {
        code: 'm2',
        name: 'Metro cuadrado',
        kind: 'area',
        precision: 2,
      }),
    ).rejects.toThrow('Ya existe una unidad');
  });

  it('no permite editar unidades globales', async () => {
    const { service } = createService();

    await expect(
      service.updateUnit('company-1', GLOBAL_UNIT.id, { name: 'Otro' }),
    ).rejects.toThrow('globales');
  });

  it('valida que la conversión sea del mismo tipo y con factor positivo', async () => {
    const { service } = createService({
      findUnitById: vi.fn(async (_companyId, id) =>
        id === 'unit-length'
          ? { ...UNIT, id: 'unit-length', kind: 'length' }
          : UNIT,
      ),
    });

    await expect(
      service.addConversion('company-1', 'unit-length', {
        toUnitId: UNIT.id,
        factor: 2,
      }),
    ).rejects.toThrow('mismo tipo');

    await expect(
      service.addConversion('company-1', UNIT.id, {
        toUnitId: 'unit-length',
        factor: 0,
      }),
    ).rejects.toThrow('mayor a cero');
  });

  it('crea impuestos con país normalizado y tasa numérica', async () => {
    const { service, repository } = createService();

    await service.createTaxRate('company-1', {
      code: ' IVA-19 ',
      name: 'IVA 19%',
      rate: 19,
      countryCode: 'co',
    });

    expect(repository.createTaxRate).toHaveBeenCalledWith('company-1', {
      code: 'iva-19',
      name: 'IVA 19%',
      rate: 19,
      countryCode: 'CO',
      isActive: true,
    });
  });

  it('exige escritura habilitada para eliminar impuestos', async () => {
    const { service, repository, entitlements } = createService();

    await service.deleteTaxRate('company-1', TAX.id);

    expect(entitlements.assertWritableModule).toHaveBeenCalled();
    expect(repository.deleteTaxRate).toHaveBeenCalledWith('company-1', TAX.id);
  });
});
