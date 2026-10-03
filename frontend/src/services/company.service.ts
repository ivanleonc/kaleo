import { apiClient } from '@/api/axios';
import type { UpdateCompanyPayload, CompanyDetail } from '@/types/company';

export const companyService = {
  async getCompanies() {
    const response = await apiClient.get('/companies');
    return response.data;
  },

  /** Todas las empresas del sistema (solo super-admin). */
  async getAllCompanies(): Promise<{ success: boolean; data: Array<{ id: string; name: string; slug: string | null; tax_id: string | null; is_active: boolean; member_count: number }> }> {
    const response = await apiClient.get('/companies/all');
    return response.data;
  },

  async getCompany(companyId: string): Promise<{ success: boolean; data: CompanyDetail }> {
    const response = await apiClient.get(`/companies/${companyId}/detail`);
    return response.data;
  },

  async createCompany(payload: { name: string; tax_id?: string; slug?: string }) {
    const response = await apiClient.post('/companies', payload);
    return response.data;
  },

  async updateCompany(companyId: string, payload: UpdateCompanyPayload) {
    const response = await apiClient.put(`/companies/${companyId}`, payload);
    return response.data;
  },
};
