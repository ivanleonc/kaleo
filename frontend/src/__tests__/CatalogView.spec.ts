import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CatalogView from '@/views/CatalogView.vue';

const { mockUnits, mockTaxes, mockCurrencies } = vi.hoisted(() => ({
  mockUnits: vi.fn(),
  mockTaxes: vi.fn(),
  mockCurrencies: vi.fn(),
}));

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listUnits: mockUnits,
    listTaxRates: mockTaxes,
    getCurrencies: mockCurrencies,
    createUnit: vi.fn(),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
    listConversions: vi.fn(),
    addConversion: vi.fn(),
    deleteConversion: vi.fn(),
    createTaxRate: vi.fn(),
    updateTaxRate: vi.fn(),
    deleteTaxRate: vi.fn(),
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const UNITS = [
  {
    id: 'unit-m',
    company_id: null,
    code: 'm',
    name: 'Metro',
    kind: 'length',
    precision: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    is_global: true,
    conversions_count: 2,
  },
  {
    id: 'unit-m2',
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
  },
];

const TAXES = [
  {
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
  },
];

const CURRENCIES = [
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimal_digits: 2, is_active: true },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimal_digits: 2, is_active: true },
];

describe('CatalogView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockUnits.mockResolvedValue(UNITS);
    mockTaxes.mockResolvedValue(TAXES);
    mockCurrencies.mockResolvedValue(CURRENCIES);
  });

  it('muestra unidades globales y de empresa', async () => {
    const wrapper = mount(CatalogView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Metro');
    expect(wrapper.text()).toContain('Metro cuadrado');
    expect(wrapper.text()).toContain('Global');
    expect(wrapper.text()).toContain('Empresa');
    expect(mockUnits).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('cambia a impuestos y monedas', async () => {
    const wrapper = mount(CatalogView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    const taxesTab = wrapper.findAll('button').find((button) => button.text() === 'Impuestos');
    await taxesTab!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('IVA 19%');
    expect(wrapper.text()).toContain('CO');

    const currenciesTab = wrapper.findAll('button').find((button) => button.text() === 'Monedas');
    await currenciesTab!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Peso colombiano');
    expect(wrapper.text()).toContain('USD');

    wrapper.unmount();
  });
});
