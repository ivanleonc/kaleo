import { apiClient } from '@/api/axios';
import { fetchExportFile, type ExportedFile, type ExportFormat } from '@/api/export';
import type { BranchesResponse, BranchResponse, CreateBranchPayload, UpdateBranchPayload } from '@/types/branch';

export const branchService = {
  async getBranches(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<BranchesResponse> {
    const response = await apiClient.get<BranchesResponse>('/companies/branches', { params });
    return response.data;
  },

  async createBranch(payload: CreateBranchPayload): Promise<BranchResponse> {
    const response = await apiClient.post<BranchResponse>('/companies/branches', payload);
    return response.data;
  },

  async updateBranch(branchId: string, payload: UpdateBranchPayload): Promise<BranchResponse> {
    const response = await apiClient.patch<BranchResponse>(`/companies/branches/${branchId}`, payload);
    return response.data;
  },

  async deleteBranch(branchId: string) {
    const response = await apiClient.delete(`/companies/branches/${branchId}`);
    return response.data;
  },

  async exportBranches(params: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    format: ExportFormat;
    columns?: string[];
  }): Promise<ExportedFile> {
    return fetchExportFile('/companies/branches/export', {
      ...params,
      columns: params.columns?.join(','),
    });
  },
};
