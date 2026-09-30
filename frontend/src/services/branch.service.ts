import { apiClient } from '@/api/axios';
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
};
