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
};
