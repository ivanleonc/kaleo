import { apiClient } from '@/api/axios';
import type {
  CreateTaxRatePayload,
  CreateUnitPayload,
  Currency,
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
};
