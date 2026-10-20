import { defineStore } from 'pinia';
import { usePaginatedSetup } from '@/composables/createPaginatedStore';
import { analysisService } from '@/services/analysis.service';
import type {
  Analysis,
  AnalysisDetail,
  CreateAnalysisPayload,
  RenameAnalysisPayload,
} from '@/types/analysis';

export interface AnalysisFilters extends Record<string, unknown> {
  search?: string;
  analysis_type?: string;
}

export const useAnalysisStore = defineStore('analysis', () => {
  const paginated = usePaginatedSetup<Analysis, AnalysisFilters>({
    fetchFn: analysisService.getAnalyses.bind(analysisService),
    defaultFilters: { search: undefined, analysis_type: undefined },
  });

  const analyses = paginated.items;
  const fetchAnalyses = (targetPage?: number) => paginated.fetch(targetPage);

  const refreshSilently = async () => {
    await paginated.refresh().catch(() => {
      paginated.error.value = null;
    });
  };

  const createAnalysis = async (payload: CreateAnalysisPayload): Promise<Analysis> => {
    const response = await paginated.withLoading(
      () => analysisService.createAnalysis(payload),
      'Error al guardar el análisis',
    );
    await refreshSilently();
    return response!.data;
  };

  const fetchAnalysis = async (analysisId: string): Promise<AnalysisDetail> => {
    const response = await paginated.withLoading(
      () => analysisService.getAnalysis(analysisId),
      'Error al cargar el análisis',
    );
    return response!.data;
  };

  const renameAnalysis = async (
    analysisId: string,
    name: string,
  ): Promise<Analysis> => {
    const payload: RenameAnalysisPayload = { name };
    const response = await paginated.withLoading(
      () => analysisService.renameAnalysis(analysisId, payload),
      'Error al renombrar el análisis',
    );
    await refreshSilently();
    return response!.data;
  };

  const deleteAnalysis = async (analysisId: string): Promise<void> => {
    await paginated.withLoading(
      () => analysisService.deleteAnalysis(analysisId),
      'Error al eliminar el análisis',
    );
    await refreshSilently();
  };

  return {
    ...paginated,
    analyses,
    fetchAnalyses,
    createAnalysis,
    fetchAnalysis,
    renameAnalysis,
    deleteAnalysis,
  };
});
