import { apiClient } from '@/api/axios';
import { fetchExportFile, type ExportedFile, type ExportFormat } from '@/api/export';
import type {
  AnalysesResponse,
  AnalysisDetailResponse,
  AnalysisResponse,
  CreateAnalysisPayload,
  RenameAnalysisPayload,
} from '@/types/analysis';

export const analysisService = {
  async getAnalyses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    analysis_type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<AnalysesResponse> {
    const response = await apiClient.get<AnalysesResponse>('/companies/analyses', { params });
    return response.data;
  },

  async getAnalysis(analysisId: string): Promise<AnalysisDetailResponse> {
    const response = await apiClient.get<AnalysisDetailResponse>(
      `/companies/analyses/${analysisId}`,
    );
    return response.data;
  },

  async createAnalysis(payload: CreateAnalysisPayload): Promise<AnalysisResponse> {
    const response = await apiClient.post<AnalysisResponse>('/companies/analyses', payload);
    return response.data;
  },

  async renameAnalysis(
    analysisId: string,
    payload: RenameAnalysisPayload,
  ): Promise<AnalysisResponse> {
    const response = await apiClient.patch<AnalysisResponse>(
      `/companies/analyses/${analysisId}`,
      payload,
    );
    return response.data;
  },

  async deleteAnalysis(analysisId: string) {
    const response = await apiClient.delete(`/companies/analyses/${analysisId}`);
    return response.data;
  },

  async exportAnalyses(params: {
    search?: string;
    analysis_type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    format: ExportFormat;
    columns?: string[];
  }): Promise<ExportedFile> {
    return fetchExportFile('/companies/analyses/export', {
      ...params,
      columns: params.columns?.join(','),
    });
  },

  async exportCriticalZones(
    analysisId: string,
    params: { format: ExportFormat; columns?: string[] },
  ): Promise<ExportedFile> {
    return fetchExportFile(`/companies/analyses/${analysisId}/critical-zones/export`, {
      ...params,
      columns: params.columns?.join(','),
    });
  },
};
