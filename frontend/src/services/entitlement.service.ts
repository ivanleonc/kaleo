import type { EntitlementsSnapshot } from '@saas/shared';
import { apiClient } from '@/api/axios';

export interface EntitlementsResponse {
  success: boolean;
  data: EntitlementsSnapshot;
}

export const entitlementService = {
  async getSnapshot(): Promise<EntitlementsResponse> {
    const response = await apiClient.get<EntitlementsResponse>('/entitlements');
    return response.data;
  },
};
