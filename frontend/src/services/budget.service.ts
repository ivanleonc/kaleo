import { apiClient } from '@/api/axios';
import type {
  BudgetDetail,
  CreateBudgetItemPayload,
  UpdateBudgetItemPayload,
} from '@/types/budget';

interface BudgetResponse {
  success: boolean;
  message?: string;
  data: BudgetDetail;
}

interface BudgetGetResponse {
  success: boolean;
  message?: string;
  data: BudgetDetail | null;
}

function data<T>(response: { data: { success: boolean; data: T } }): T {
  return response.data.data;
}

export const budgetService = {
  async getByProject(projectId: string): Promise<BudgetDetail | null> {
    const response = await apiClient.get<BudgetGetResponse>(`/projects/${projectId}/budget`);
    return response.data.data;
  },

  async create(projectId: string, apuBaseId?: string | null): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/projects/${projectId}/budget`, {
      apuBaseId: apuBaseId || null,
    });
    return data(response);
  },

  async update(
    id: string,
    payload: { name?: string; indirectPct?: number; indirectFixed?: number },
  ): Promise<BudgetDetail> {
    const response = await apiClient.patch<BudgetResponse>(`/budgets/${id}`, payload);
    return data(response);
  },

  async calculate(id: string): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/budgets/${id}/calculate`);
    return data(response);
  },

  async approve(id: string): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/budgets/${id}/approve`);
    return data(response);
  },

  async addItem(id: string, payload: CreateBudgetItemPayload): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/budgets/${id}/items`, payload);
    return data(response);
  },

  async addFromApus(
    id: string,
    payload: { apuIds: string[]; parentId?: string | null },
  ): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(
      `/budgets/${id}/items/from-apus`,
      payload,
    );
    return data(response);
  },

  async updateItem(
    id: string,
    itemId: string,
    payload: UpdateBudgetItemPayload,
  ): Promise<BudgetDetail> {
    const response = await apiClient.patch<BudgetResponse>(
      `/budgets/${id}/items/${itemId}`,
      payload,
    );
    return data(response);
  },

  async deleteItem(id: string, itemId: string): Promise<BudgetDetail> {
    const response = await apiClient.delete<BudgetResponse>(`/budgets/${id}/items/${itemId}`);
    return data(response);
  },
};
