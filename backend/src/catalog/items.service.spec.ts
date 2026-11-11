import { describe, expect, it, vi } from 'vitest';
import { CatalogItemsService } from './items.service.js';

const CATEGORY = {
  id: 'cat-1',
  company_id: 'company-1',
  parent_id: null,
  name: 'Materiales',
  path: '/cat-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const ITEM = {
  id: 'item-1',
  company_id: 'company-1',
  sku: 'CEM-001',
  name: 'Cemento',
  description: null,
  item_type: 'product',
  category_id: 'cat-1',
  category_name: 'Materiales',
  unit_id: 'unit-1',
  unit_code: 'kg',
  unit_name: 'Kilogramo',
  tax_rate_id: null,
  tax_name: null,
  tax_rate: null,
  cost: 10,
  price: 15,
  currency_code: 'COP',
  is_stockable: true,
  status: 'active',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const PRICE_LIST = {
  id: 'list-1',
  company_id: 'company-1',
  code: 'general',
  name: 'General',
  currency_code: 'COP',
  is_default: true,
  valid_from: null,
  valid_to: null,
  is_active: true,
  prices_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const ITEM_PRICE = {
  id: 'price-1',
  company_id: 'company-1',
  price_list_id: 'list-1',
  item_id: 'item-1',
  item_sku: 'CEM-001',
  item_name: 'Cemento',
  price: 15,
  min_quantity: 1,
  valid_from: null,
  valid_to: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    listCategories: vi.fn(async () => [CATEGORY]),
    findCategoryById: vi.fn(async () => CATEGORY),
    createCategory: vi.fn(async () => CATEGORY),
    updateCategory: vi.fn(async () => CATEGORY),
    updateDescendantPaths: vi.fn(async () => {}),
    deleteCategory: vi.fn(async () => true),
    countCategoryChildren: vi.fn(async () => 0),
    countCategoryItems: vi.fn(async () => 0),
    listItems: vi.fn(async () => ({ data: [ITEM], total: 1 })),
    findItemById: vi.fn(async () => ITEM),
    findItemBySku: vi.fn(async () => null),
    createItem: vi.fn(async () => ITEM),
    updateItem: vi.fn(async () => ITEM),
    deleteItem: vi.fn(async () => true),
    unitExists: vi.fn(async () => true),
    taxRateExists: vi.fn(async () => true),
    currencyExists: vi.fn(async () => true),
    listPriceLists: vi.fn(async () => [PRICE_LIST]),
    findPriceListById: vi.fn(async () => PRICE_LIST),
    findPriceListByCode: vi.fn(async () => null),
    createPriceList: vi.fn(async () => PRICE_LIST),
    updatePriceList: vi.fn(async () => PRICE_LIST),
    deletePriceList: vi.fn(async () => true),
    listItemPrices: vi.fn(async () => [ITEM_PRICE]),
    findItemPriceById: vi.fn(async () => ITEM_PRICE),
    findDuplicateItemPrice: vi.fn(async () => null),
    createItemPrice: vi.fn(async () => ITEM_PRICE),
    updateItemPrice: vi.fn(async () => ITEM_PRICE),
    deleteItemPrice: vi.fn(async () => true),
    itemBelongs: vi.fn(async () => true),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new CatalogItemsService(repository, entitlements), repository, entitlements };
}

describe('CatalogItemsService', () => {
  it('crea un ítem validando unidad, moneda y SKU', async () => {
    const { service, repository, entitlements } = createService();

    await service.createItem('company-1', 'user-1', {
      sku: 'CEM-001',
      name: 'Cemento',
      itemType: 'product',
      unitId: 'unit-1',
      cost: 10,
      price: 15,
      currencyCode: 'COP',
      isStockable: true,
    });

    expect(entitlements.assertWritableModule).toHaveBeenCalledWith(
      'company-1',
      'shared.catalog',
    );
    expect(repository.unitExists).toHaveBeenCalledWith('company-1', 'unit-1');
    expect(repository.currencyExists).toHaveBeenCalledWith('COP');
    expect(repository.createItem).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ sku: 'CEM-001', name: 'Cemento' }),
    );
  });

  it('rechaza SKU duplicado', async () => {
    const { service } = createService({ findItemBySku: vi.fn(async () => ITEM) });

    await expect(
      service.createItem('company-1', 'user-1', {
        sku: 'CEM-001',
        name: 'Cemento',
        itemType: 'product',
        unitId: 'unit-1',
        cost: 10,
        price: 15,
        currencyCode: 'COP',
        isStockable: true,
      }),
    ).rejects.toThrow('SKU');
  });

  it('impide mover una categoría dentro de su descendencia', async () => {
    const child = {
      ...CATEGORY,
      id: 'cat-child',
      parent_id: 'cat-1',
      path: '/cat-1/cat-child',
    };
    const { service } = createService({
      findCategoryById: vi.fn(async (_companyId, id) =>
        id === 'cat-child' ? child : CATEGORY,
      ),
    });

    await expect(
      service.updateCategory('company-1', 'cat-1', { parentId: 'cat-child' }),
    ).rejects.toThrow('descendencia');
  });

  it('no elimina categorías con hijos o ítems', async () => {
    const { service } = createService({ countCategoryChildren: vi.fn(async () => 1) });

    await expect(service.deleteCategory('company-1', 'cat-1')).rejects.toThrow(
      'subcategorías',
    );
  });

  it('crea listas de precios con código normalizado', async () => {
    const { service, repository } = createService();

    await service.createPriceList('company-1', {
      code: ' GENERAL ',
      name: 'General',
      currencyCode: 'COP',
      isDefault: true,
      isActive: true,
    });

    expect(repository.findPriceListByCode).toHaveBeenCalledWith('company-1', 'general');
    expect(repository.createPriceList).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ code: 'general', isDefault: true }),
    );
  });

  it('valida cantidad mínima y duplicados de precio', async () => {
    const { service } = createService();

    await expect(
      service.createItemPrice('company-1', 'list-1', {
        itemId: 'item-1',
        price: 15,
        minQuantity: 0,
      }),
    ).rejects.toThrow('cantidad mínima');

    const duplicate = createService({
      findDuplicateItemPrice: vi.fn(async () => ITEM_PRICE),
    });
    await expect(
      duplicate.service.createItemPrice('company-1', 'list-1', {
        itemId: 'item-1',
        price: 15,
        minQuantity: 1,
      }),
    ).rejects.toThrow('Ya existe un precio');
  });
});
