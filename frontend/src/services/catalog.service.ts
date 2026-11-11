import { apiClient } from '@/api/axios';
import type {
  CatalogItem,
  CreateCatalogItemPayload,
  CreateItemCategoryPayload,
  CreateItemPricePayload,
  CreatePriceListPayload,
  CreateTaxRatePayload,
  CreateUnitPayload,
  Currency,
  ItemCategory,
  ItemPrice,
  PriceList,
  TaxRate,
  Unit,
  UnitConversion,
  UnitKind,
} from '@/types/catalog';

interface DataResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const catalogService = {
  async getCurrencies(): Promise<Currency[]> {
    const response = await apiClient.get<DataResponse<Currency[]>>('/catalog/currencies');
    return response.data.data;
  },

  async listUnits(filters: {
    search?: string;
    kind?: UnitKind;
    includeInactive?: boolean;
  } = {}): Promise<Unit[]> {
    const response = await apiClient.get<DataResponse<Unit[]>>('/catalog/units', {
      params: {
        search: filters.search || undefined,
        kind: filters.kind || undefined,
        includeInactive: filters.includeInactive ? 'true' : undefined,
      },
    });
    return response.data.data;
  },

  async createUnit(payload: CreateUnitPayload): Promise<Unit> {
    const response = await apiClient.post<DataResponse<Unit>>('/catalog/units', payload);
    return response.data.data;
  },

  async updateUnit(id: string, payload: Partial<CreateUnitPayload>): Promise<Unit> {
    const response = await apiClient.patch<DataResponse<Unit>>(`/catalog/units/${id}`, payload);
    return response.data.data;
  },

  async deleteUnit(id: string): Promise<void> {
    await apiClient.delete(`/catalog/units/${id}`);
  },

  async listConversions(unitId: string): Promise<UnitConversion[]> {
    const response = await apiClient.get<DataResponse<UnitConversion[]>>(
      `/catalog/units/${unitId}/conversions`,
    );
    return response.data.data;
  },

  async addConversion(
    unitId: string,
    payload: { toUnitId: string; factor: number },
  ): Promise<UnitConversion> {
    const response = await apiClient.post<DataResponse<UnitConversion>>(
      `/catalog/units/${unitId}/conversions`,
      payload,
    );
    return response.data.data;
  },

  async deleteConversion(unitId: string, conversionId: string): Promise<void> {
    await apiClient.delete(`/catalog/units/${unitId}/conversions/${conversionId}`);
  },

  async listTaxRates(filters: { search?: string; includeInactive?: boolean } = {}): Promise<TaxRate[]> {
    const response = await apiClient.get<DataResponse<TaxRate[]>>('/catalog/tax-rates', {
      params: {
        search: filters.search || undefined,
        includeInactive: filters.includeInactive ? 'true' : undefined,
      },
    });
    return response.data.data;
  },

  async createTaxRate(payload: CreateTaxRatePayload): Promise<TaxRate> {
    const response = await apiClient.post<DataResponse<TaxRate>>('/catalog/tax-rates', payload);
    return response.data.data;
  },

  async updateTaxRate(id: string, payload: Partial<CreateTaxRatePayload>): Promise<TaxRate> {
    const response = await apiClient.patch<DataResponse<TaxRate>>(
      `/catalog/tax-rates/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteTaxRate(id: string): Promise<void> {
    await apiClient.delete(`/catalog/tax-rates/${id}`);
  },

  async listCategories(): Promise<ItemCategory[]> {
    const response = await apiClient.get<DataResponse<ItemCategory[]>>(
      '/catalog/item-categories',
    );
    return response.data.data;
  },

  async createCategory(payload: CreateItemCategoryPayload): Promise<ItemCategory> {
    const response = await apiClient.post<DataResponse<ItemCategory>>(
      '/catalog/item-categories',
      payload,
    );
    return response.data.data;
  },

  async updateCategory(
    id: string,
    payload: Partial<CreateItemCategoryPayload>,
  ): Promise<ItemCategory> {
    const response = await apiClient.patch<DataResponse<ItemCategory>>(
      `/catalog/item-categories/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/catalog/item-categories/${id}`);
  },

  async listItems(filters: {
    search?: string;
    categoryId?: string;
    itemType?: 'product' | 'service';
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: CatalogItem[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{
      success: boolean;
      data: CatalogItem[];
      total: number;
      page: number;
      limit: number;
    }>('/catalog/items', {
      params: {
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        itemType: filters.itemType || undefined,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit,
      },
    });
    return response.data;
  },

  async getItem(id: string): Promise<CatalogItem> {
    const response = await apiClient.get<DataResponse<CatalogItem>>(`/catalog/items/${id}`);
    return response.data.data;
  },

  async createItem(payload: CreateCatalogItemPayload): Promise<CatalogItem> {
    const response = await apiClient.post<DataResponse<CatalogItem>>('/catalog/items', payload);
    return response.data.data;
  },

  async updateItem(
    id: string,
    payload: Partial<CreateCatalogItemPayload>,
  ): Promise<CatalogItem> {
    const response = await apiClient.patch<DataResponse<CatalogItem>>(
      `/catalog/items/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/catalog/items/${id}`);
  },

  async listPriceLists(): Promise<PriceList[]> {
    const response = await apiClient.get<DataResponse<PriceList[]>>('/catalog/price-lists');
    return response.data.data;
  },

  async createPriceList(payload: CreatePriceListPayload): Promise<PriceList> {
    const response = await apiClient.post<DataResponse<PriceList>>(
      '/catalog/price-lists',
      payload,
    );
    return response.data.data;
  },

  async updatePriceList(
    id: string,
    payload: Partial<CreatePriceListPayload>,
  ): Promise<PriceList> {
    const response = await apiClient.patch<DataResponse<PriceList>>(
      `/catalog/price-lists/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deletePriceList(id: string): Promise<void> {
    await apiClient.delete(`/catalog/price-lists/${id}`);
  },

  async listItemPrices(priceListId: string): Promise<ItemPrice[]> {
    const response = await apiClient.get<DataResponse<ItemPrice[]>>(
      `/catalog/price-lists/${priceListId}/prices`,
    );
    return response.data.data;
  },

  async createItemPrice(
    priceListId: string,
    payload: CreateItemPricePayload,
  ): Promise<ItemPrice> {
    const response = await apiClient.post<DataResponse<ItemPrice>>(
      `/catalog/price-lists/${priceListId}/prices`,
      payload,
    );
    return response.data.data;
  },

  async updateItemPrice(
    priceListId: string,
    priceId: string,
    payload: Partial<Omit<CreateItemPricePayload, 'itemId'>>,
  ): Promise<ItemPrice> {
    const response = await apiClient.patch<DataResponse<ItemPrice>>(
      `/catalog/price-lists/${priceListId}/prices/${priceId}`,
      payload,
    );
    return response.data.data;
  },

  async deleteItemPrice(priceListId: string, priceId: string): Promise<void> {
    await apiClient.delete(`/catalog/price-lists/${priceListId}/prices/${priceId}`);
  },
};
