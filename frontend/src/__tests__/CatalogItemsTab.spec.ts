import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CatalogItemsTab from '@/components/catalog/CatalogItemsTab.vue';

const { mockListItems, mockCategories, mockUnits, mockTaxes, mockCurrencies } = vi.hoisted(() => ({
  mockListItems: vi.fn(),
  mockCategories: vi.fn(),
  mockUnits: vi.fn(),
  mockTaxes: vi.fn(),
  mockCurrencies: vi.fn(),
}));

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listItems: mockListItems,
    listCategories: mockCategories,
    listUnits: mockUnits,
    listTaxRates: mockTaxes,
    getCurrencies: mockCurrencies,
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const ITEM = {
  id: 'item-1',
  company_id: 'company-1',
  sku: 'CEM-001',
  name: 'Cemento gris',
  description: null,
  item_type: 'product',
  category_id: 'cat-1',
  category_name: 'Materiales',
  unit_id: 'unit-1',
  unit_code: 'kg',
  unit_name: 'Kilogramo',
  tax_rate_id: 'tax-1',
  tax_name: 'IVA 19%',
  tax_rate: 19,
  cost: 1000,
  price: 1500,
  currency_code: 'COP',
  is_stockable: true,
  status: 'active',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

describe('CatalogItemsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockListItems.mockResolvedValue({ data: [ITEM], total: 1, page: 1, limit: 25 });
    mockCategories.mockResolvedValue([
      { id: 'cat-1', company_id: 'company-1', parent_id: null, name: 'Materiales', path: '/cat-1' },
    ]);
    mockUnits.mockResolvedValue([
      { id: 'unit-1', company_id: null, code: 'kg', name: 'Kilogramo', kind: 'mass', precision: 3, is_active: true, is_global: true, conversions_count: 0, created_at: '', updated_at: '', deleted_at: null },
    ]);
    mockTaxes.mockResolvedValue([
      { id: 'tax-1', company_id: 'company-1', code: 'iva-19', name: 'IVA 19%', rate: 19, country_code: 'CO', is_active: true, created_at: '', updated_at: '', deleted_at: null },
    ]);
    mockCurrencies.mockResolvedValue([
      { code: 'COP', name: 'Peso colombiano', symbol: '$', decimal_digits: 2, is_active: true },
    ]);
  });

  it('lista los ítems con unidad, impuesto y precio', async () => {
    const wrapper = mount(CatalogItemsTab, {
      global: {
        plugins: [createPinia()],
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('CEM-001');
    expect(wrapper.text()).toContain('Cemento gris');
    expect(wrapper.text()).toContain('Materiales');
    expect(wrapper.text()).toContain('IVA 19%');
    expect(mockListItems).toHaveBeenCalled();

    wrapper.unmount();
  });
});
