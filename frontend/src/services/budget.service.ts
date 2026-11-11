import { apiClient } from '@/api/axios';
import { fetchExportFile, type ExportFormat, type ExportedFile } from '@/api/export';
import type {
  BudgetDetail,
  BudgetImportSummary,
  BudgetVersionSummary,
  CompareResult,
  CreateBudgetItemPayload,
  CreateTakeoffLinePayload,
  CreateTakeoffSheetPayload,
  MaterialRow,
  TakeoffSheet,
  TakeoffSheetDetail,
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

  async getById(id: string): Promise<BudgetDetail> {
    const response = await apiClient.get<BudgetResponse>(`/budgets/${id}`);
    return data(response);
  },

  async create(projectId: string, apuBaseId?: string | null): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/projects/${projectId}/budget`, {
      apuBaseId: apuBaseId || null,
    });
    return data(response);
  },

  async update(
    id: string,
    payload: {
      name?: string;
      label?: string | null;
      indirectPct?: number;
      indirectFixed?: number;
    },
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

  async listVersions(projectId: string): Promise<BudgetVersionSummary[]> {
    const response = await apiClient.get<{ success: boolean; data: BudgetVersionSummary[] }>(
      `/projects/${projectId}/budgets`,
    );
    return response.data.data;
  },

  async createVersion(id: string, label?: string | null): Promise<BudgetDetail> {
    const response = await apiClient.post<BudgetResponse>(`/budgets/${id}/versions`, {
      label: label || null,
    });
    return data(response);
  },

  async compare(id: string, otherId: string): Promise<CompareResult> {
    const response = await apiClient.get<{ success: boolean; data: CompareResult }>(
      `/budgets/${id}/compare/${otherId}`,
    );
    return response.data.data;
  },

  async getMaterials(id: string): Promise<MaterialRow[]> {
    const response = await apiClient.get<{ success: boolean; data: MaterialRow[] }>(
      `/budgets/${id}/materials`,
    );
    return response.data.data;
  },

  async exportMaterials(id: string, format: ExportFormat = 'xlsx'): Promise<ExportedFile> {
    return fetchExportFile(`/budgets/${id}/materials/export`, { format });
  },

  async exportBudget(id: string, format: ExportFormat = 'xlsx'): Promise<ExportedFile> {
    return fetchExportFile(`/budgets/${id}/export`, { format });
  },

  async importBudget(projectId: string, file: File): Promise<BudgetImportSummary> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ success: boolean; data: BudgetImportSummary }>(
      `/projects/${projectId}/budget/import`,
      formData,
    );
    return response.data.data;
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

  // ─── Takeoff ──────────────────────────────────────────────────────────────
  async listTakeoffSheets(projectId: string): Promise<TakeoffSheet[]> {
    const response = await apiClient.get<{ success: boolean; data: TakeoffSheet[] }>(
      `/projects/${projectId}/takeoff`,
    );
    return response.data.data;
  },

  async getTakeoffSheet(id: string): Promise<TakeoffSheetDetail> {
    const response = await apiClient.get<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/sheets/${id}`,
    );
    return response.data.data;
  },

  async createTakeoffSheet(
    projectId: string,
    payload: CreateTakeoffSheetPayload,
  ): Promise<TakeoffSheetDetail> {
    const response = await apiClient.post<{ success: boolean; data: TakeoffSheetDetail }>(
      `/projects/${projectId}/takeoff`,
      payload,
    );
    return response.data.data;
  },

  async updateTakeoffSheet(
    id: string,
    payload: Partial<CreateTakeoffSheetPayload> & { status?: 'draft' | 'confirmed' },
  ): Promise<TakeoffSheetDetail> {
    const response = await apiClient.patch<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/sheets/${id}`,
      payload,
    );
    return response.data.data;
  },

  async deleteTakeoffSheet(id: string): Promise<void> {
    await apiClient.delete(`/takeoff/sheets/${id}`);
  },

  async addTakeoffLine(
    sheetId: string,
    payload: CreateTakeoffLinePayload,
  ): Promise<TakeoffSheetDetail> {
    const response = await apiClient.post<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/sheets/${sheetId}/lines`,
      payload,
    );
    return response.data.data;
  },

  async updateTakeoffLine(
    lineId: string,
    payload: Partial<CreateTakeoffLinePayload>,
  ): Promise<TakeoffSheetDetail> {
    const response = await apiClient.patch<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/lines/${lineId}`,
      payload,
    );
    return response.data.data;
  },

  async deleteTakeoffLine(lineId: string): Promise<TakeoffSheetDetail> {
    const response = await apiClient.delete<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/lines/${lineId}`,
    );
    return response.data.data;
  },

  async applyTakeoff(sheetId: string): Promise<TakeoffSheetDetail> {
    const response = await apiClient.post<{ success: boolean; data: TakeoffSheetDetail }>(
      `/takeoff/sheets/${sheetId}/apply`,
    );
    return response.data.data;
  },
};
