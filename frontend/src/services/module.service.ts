import type { EnabledModule } from '@saas/shared';
import { apiClient } from '@/api/axios';

export interface ModulesResponse {
  success: boolean;
  data: EnabledModule[];
}

export const moduleService = {
  async getModules(): Promise<ModulesResponse> {
    const response = await apiClient.get<ModulesResponse>('/modules');
    return response.data;
  },

  async getCatalog(): Promise<ModulesResponse> {
    const response = await apiClient.get<ModulesResponse>('/modules/catalog');
    return response.data;
  },

  async setModule(code: string, enabled: boolean) {
    const response = await apiClient.put(`/modules/${encodeURIComponent(code)}`, { enabled });
    return response.data;
  },
};
