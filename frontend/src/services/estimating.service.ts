import { apiClient } from '@/api/axios';
import type {
  Apu,
  ApuBase,
  ApuDetail,
  ApuLine,
  CreateApuBasePayload,
  CreateApuLinePayload,
  CreateApuPayload,
  CreateResourcePayload,
  ImportApusResult,
  Resource,
  ResourcePrice,
  ResourceType,
} from '@/types/estimating';

interface DataResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const estimatingService = {
  async listResources(filters: { search?: string; resourceType?: ResourceType } = {}) {
    const response = await apiClient.get<DataResponse<Resource[]>>('/estimating/resources', {
      params: {
        search: filters.search || undefined,
        resourceType: filters.resourceType || undefined,
      },
    });
    return response.data.data;
  },

  async createResource(payload: CreateResourcePayload) {
    const response = await apiClient.post<DataResponse<Resource>>(
      '/estimating/resources',
      payload,
    );
    return response.data.data;
  },

  async updateResource(id: string, payload: Partial<CreateResourcePayload>) {
    const response = await apiClient.patch<DataResponse<Resource>>(
      `/estimating/resources/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteResource(id: string) {
    await apiClient.delete(`/estimating/resources/${id}`);
  },

  async listResourcePrices(id: string) {
    const response = await apiClient.get<DataResponse<ResourcePrice[]>>(
      `/estimating/resources/${id}/prices`,
    );
    return response.data.data;
  },

  async addResourcePrice(
    id: string,
    payload: {
      supplierPartyId?: string | null;
      price: number;
      currencyCode: string;
      validFrom?: string | null;
      validTo?: string | null;
      source?: string | null;
    },
  ) {
    const response = await apiClient.post<DataResponse<ResourcePrice>>(
      `/estimating/resources/${id}/prices`,
      payload,
    );
    return response.data.data;
  },

  async deleteResourcePrice(id: string, priceId: string) {
    await apiClient.delete(`/estimating/resources/${id}/prices/${priceId}`);
  },

  async listApuBases() {
    const response = await apiClient.get<DataResponse<ApuBase[]>>('/estimating/apu-bases');
    return response.data.data;
  },

  async createApuBase(payload: CreateApuBasePayload) {
    const response = await apiClient.post<DataResponse<ApuBase>>(
      '/estimating/apu-bases',
      payload,
    );
    return response.data.data;
  },

  async updateApuBase(id: string, payload: Partial<CreateApuBasePayload>) {
    const response = await apiClient.patch<DataResponse<ApuBase>>(
      `/estimating/apu-bases/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteApuBase(id: string) {
    await apiClient.delete(`/estimating/apu-bases/${id}`);
  },

  async listApus(filters: { search?: string; baseId?: string } = {}) {
    const response = await apiClient.get<DataResponse<Apu[]>>('/estimating/apus', {
      params: {
        search: filters.search || undefined,
        baseId: filters.baseId || undefined,
      },
    });
    return response.data.data;
  },

  async getApu(id: string) {
    const response = await apiClient.get<DataResponse<ApuDetail>>(`/estimating/apus/${id}`);
    return response.data.data;
  },

  async createApu(payload: CreateApuPayload) {
    const response = await apiClient.post<DataResponse<ApuDetail>>('/estimating/apus', payload);
    return response.data.data;
  },

  async updateApu(id: string, payload: Partial<CreateApuPayload>) {
    const response = await apiClient.patch<DataResponse<ApuDetail>>(
      `/estimating/apus/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteApu(id: string) {
    await apiClient.delete(`/estimating/apus/${id}`);
  },

  async createApuVersion(id: string) {
    const response = await apiClient.post<DataResponse<ApuDetail>>(
      `/estimating/apus/${id}/versions`,
    );
    return response.data.data;
  },

  async approveApu(id: string) {
    const response = await apiClient.post<DataResponse<ApuDetail>>(
      `/estimating/apus/${id}/approve`,
    );
    return response.data.data;
  },

  async addApuLine(id: string, payload: CreateApuLinePayload) {
    const response = await apiClient.post<DataResponse<ApuLine>>(
      `/estimating/apus/${id}/lines`,
      payload,
    );
    return response.data.data;
  },

  async updateApuLine(
    lineId: string,
    payload: { quantity?: number; wastePct?: number; performance?: number; notes?: string | null },
  ) {
    const response = await apiClient.patch<DataResponse<ApuLine>>(
      `/estimating/apu-lines/${lineId}`,
      payload,
    );
    return response.data.data;
  },

  async deleteApuLine(lineId: string) {
    await apiClient.delete(`/estimating/apu-lines/${lineId}`);
  },

  async importApus(baseId: string, file: File): Promise<ImportApusResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('baseId', baseId);
    const response = await apiClient.post<DataResponse<ImportApusResult>>(
      '/estimating/apus/import',
      formData,
    );
    return response.data.data;
  },
};
