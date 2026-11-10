import { apiClient } from '@/api/axios';
import { fetchExportFile, type ExportedFile } from '@/api/export';
import type { ExportResource, Operation } from '@/types/operation';

interface OperationsResponse {
  success: boolean;
  data: Operation[];
}

interface OperationResponse {
  success: boolean;
  message?: string;
  data: Operation;
}

export const operationsService = {
  async list(): Promise<OperationsResponse> {
    const response = await apiClient.get<OperationsResponse>('/operations');
    return response.data;
  },

  async requestExport(
    resource: ExportResource,
    format: 'csv' | 'xlsx',
    filters?: Record<string, string>,
  ): Promise<OperationResponse> {
    const response = await apiClient.post<OperationResponse>(
      `/operations/exports/${resource}`,
      { format, filters },
    );
    return response.data;
  },

  async requestAnalysesReport(format: 'csv' | 'xlsx'): Promise<OperationResponse> {
    const response = await apiClient.post<OperationResponse>(
      '/operations/reports/analyses',
      { format },
    );
    return response.data;
  },

  async importBranchesFile(file: File): Promise<OperationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<OperationResponse>(
      '/operations/imports/branches/file',
      formData,
    );
    return response.data;
  },

  async download(id: string): Promise<ExportedFile> {
    return fetchExportFile(`/operations/${id}/download`);
  },
};
