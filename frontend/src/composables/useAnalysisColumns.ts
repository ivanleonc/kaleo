import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type { Analysis } from '@/types/analysis';

const analysisColumnHelper = createAppColumnHelper<Analysis>();

export function useAnalysisColumns(): AppColumnDef<Analysis>[] {
  return [
    analysisColumnHelper.accessor('name', {
      header: 'Análisis',
      meta: { label: 'Análisis' },
    }),
    analysisColumnHelper.accessor('analysis_type', {
      id: 'analysis_type',
      header: 'Tipo',
      meta: { label: 'Tipo' },
    }),
    analysisColumnHelper.accessor('summary', {
      id: 'summary',
      header: 'Resumen',
      meta: { label: 'Resumen' },
      enableSorting: false,
    }),
    analysisColumnHelper.accessor('created_at', {
      id: 'created_at',
      header: 'Creado',
      meta: { label: 'Creado' },
    }),
    analysisColumnHelper.display({
      id: 'actions',
      header: '',
      meta: { label: '', align: 'right' },
    }),
  ];
}
