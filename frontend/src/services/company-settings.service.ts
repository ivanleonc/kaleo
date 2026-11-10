import type { CompanySettings } from '@saas/shared';
import { apiClient } from '@/api/axios';

export interface CompanySettingsResponse {
  success: boolean;
  message?: string;
  data: CompanySettings;
}

export interface UpdateCompanySettingsPayload {
  currencyCode?: string;
  locale?: string;
  settings?: Record<string, unknown>;
}

export const companySettingsService = {
  async get(): Promise<CompanySettingsResponse> {
    const response = await apiClient.get<CompanySettingsResponse>('/company-settings');
    return response.data;
  },

  async update(payload: UpdateCompanySettingsPayload): Promise<CompanySettingsResponse> {
    const response = await apiClient.put<CompanySettingsResponse>('/company-settings', payload);
    return response.data;
  },
};
