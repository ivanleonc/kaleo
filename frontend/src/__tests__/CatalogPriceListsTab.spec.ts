import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CatalogPriceListsTab from '@/components/catalog/CatalogPriceListsTab.vue';

const { mockLists, mockItems, mockCurrencies } = vi.hoisted(() => ({
  mockLists: vi.fn(),
  mockItems: vi.fn(),
  mockCurrencies: vi.fn(),
}));

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listPriceLists: mockLists,
    listItems: mockItems,
    getCurrencies: mockCurrencies,
    createPriceList: vi.fn(),
    updatePriceList: vi.fn(),
    deletePriceList: vi.fn(),
    listItemPrices: vi.fn(),
    createItemPrice: vi.fn(),
    deleteItemPrice: vi.fn(),
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe('CatalogPriceListsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockLists.mockResolvedValue([
      {
        id: 'list-1',
        company_id: 'company-1',
        code: 'general',
        name: 'Lista general',
        currency_code: 'COP',
        is_default: true,
        valid_from: null,
        valid_to: null,
        is_active: true,
        prices_count: 3,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ]);
    mockItems.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });
    mockCurrencies.mockResolvedValue([
      { code: 'COP', name: 'Peso colombiano', symbol: '$', decimal_digits: 2, is_active: true },
    ]);
  });

  it('lista las listas de precios y su moneda', async () => {
    const wrapper = mount(CatalogPriceListsTab, {
      global: {
        plugins: [createPinia()],
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Lista general');
    expect(wrapper.text()).toContain('Predeterminada');
    expect(wrapper.text()).toContain('COP');
    expect(wrapper.text()).toContain('3 precios');

    wrapper.unmount();
  });
});
