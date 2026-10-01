import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { ServerSort } from '@/composables/useAppTable';

export interface PaginatedStoreConfig<T, F extends Record<string, unknown>> {
  /** ID único del store para Pinia */
  id: string;
  /** Función que llama al API y devuelve PagedResponse<T> */
  fetchFn: (params: F & {
    page: number;
    limit: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) => Promise<{ data: { success: boolean; data: T[]; total: number; page: number; limit: number } }>;
  /** Filtros por defecto (todos los campos en string vacío) */
  defaultFilters: F;
  /** Límite de items por página por defecto */
  defaultLimit?: number;
}

/**
 * Factory que genera stores Pinia paginados con filtros y sort server-side.
 *
 * Elimina la duplicación entre member.store y branch.store (~85% idénticos).
 * Cualquier recurso nuevo (facturas, contratos, reportes) obtiene gratis:
 *   - Paginación (page/limit/total/totalPages/hasPrev/hasNext)
 *   - Filtros server-side (applyFilters/clearFilters)
 *   - Sort server-side (setSort)
 *   - Reset automático al cambiar de empresa
 *   - Estado loading/error via useAsyncOperation
 *
 * Uso:
 * ```ts
 * const useMyStore = createPaginatedStore({
 *   id: 'my-resource',
 *   fetchFn: myService.getItems,
 *   defaultFilters: { search: '', status: '' },
 * });
 * ```
 */
export function createPaginatedStore<T, F extends Record<string, unknown>>(
  config: PaginatedStoreConfig<T, F>,
) {
  return defineStore(config.id, () => {
    const { companyId } = useCompanyPath();
    const { isLoading, error, execute: withLoading } = useAsyncOperation({
      errorMessage: 'Error en la operación',
    });

    // --- Estado de paginación ---
    const items = ref<T[]>([]);
    const page = ref(1);
    const limit = ref(config.defaultLimit ?? 20);
    const total = ref(0);
    const filters = ref<F>({ ...config.defaultFilters } as F);
    const sortBy = ref<string | undefined>(undefined);
    const sortDir = ref<'asc' | 'desc'>('asc');
    const lastCompanyId = ref<string | undefined>(undefined);

    // --- Computed ---
    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    // --- Reset al cambiar de empresa ---
    const resetState = () => {
      items.value = [];
      page.value = 1;
      total.value = 0;
      filters.value = { ...config.defaultFilters } as F;
      sortBy.value = undefined;
      sortDir.value = 'asc';
    };

    // --- Fetch principal ---
    const fetch = async (targetPage = page.value) => {
      if (!companyId.value) return;
      if (companyId.value !== lastCompanyId.value) {
        resetState();
        lastCompanyId.value = companyId.value;
      }
      await withLoading(async () => {
        const params = {
          page: targetPage,
          limit: limit.value,
          ...filters.value,
          ...(sortBy.value ? { sortBy: sortBy.value, sortDir: sortDir.value } : {}),
        } as Parameters<typeof config.fetchFn>[0];
        const response = await config.fetchFn(params);
        items.value = response.data.data as T[];
        total.value = response.data.total;
        page.value = response.data.page;
        limit.value = response.data.limit;
      });
    };

    const goToPage = async (targetPage: number) => {
      const clamped = Math.min(Math.max(1, targetPage), totalPages.value);
      if (clamped === page.value) return;
      await fetch(clamped);
    };

    const setLimit = async (newLimit: number) => {
      limit.value = newLimit;
      await fetch(1);
    };

    const applyFilters = async (next: Partial<F>) => {
      filters.value = { ...filters.value, ...next } as F;
      await fetch(1);
    };

    const clearFilters = async () => {
      filters.value = { ...config.defaultFilters } as F;
      await fetch(1);
    };

    const setSort = async (sort: ServerSort) => {
      sortBy.value = sort.sortBy;
      sortDir.value = sort.sortDir ?? 'asc';
      await fetch(1);
    };

    /** Refresca la página actual sin cambiar filtros ni sort. */
    const refresh = async () => {
      await fetch(page.value > totalPages.value ? 1 : page.value);
    };

    return {
      items,
      isLoading,
      error,
      page,
      limit,
      total,
      totalPages,
      hasPrev,
      hasNext,
      filters,
      sortBy,
      sortDir,
      resetState,
      fetch,
      goToPage,
      setLimit,
      applyFilters,
      clearFilters,
      setSort,
      refresh,
    };
  });
}
