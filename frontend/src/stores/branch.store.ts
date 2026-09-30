import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { branchService } from '@/services/branch.service';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { ServerSort } from '@/composables/useAppTable';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '@/types/branch';

export interface BranchFilters {
  search?: string;
  status?: string;
}

export const useBranchStore = defineStore('branch', () => {
  const branches = ref<Branch[]>([]);

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error en la operación' });

  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);
  const filters = ref<BranchFilters>({});
  const sortBy = ref<string | undefined>(undefined);
  const sortDir = ref<'asc' | 'desc'>('asc');

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
  const hasPrev = computed(() => page.value > 1);
  const hasNext = computed(() => page.value < totalPages.value);

  const fetchBranches = async (targetPage = page.value) => {
    await withLoading(async () => {
      const response = await branchService.getBranches({
        page: targetPage,
        limit: limit.value,
        ...filters.value,
        ...(sortBy.value ? { sortBy: sortBy.value, sortDir: sortDir.value } : {}),
      });
      branches.value = response.data;
      total.value = response.total;
      page.value = response.page;
      limit.value = response.limit;
    }, 'Error al cargar las sedes');
  };

  const goToPage = async (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), totalPages.value);
    if (clamped === page.value) return;
    await fetchBranches(clamped);
  };

  const setLimit = async (newLimit: number) => {
    limit.value = newLimit;
    await fetchBranches(1);
  };

  /** Aplica filtros en el servidor y vuelve a la primera página. */
  const applyFilters = async (next: BranchFilters) => {
    filters.value = next;
    await fetchBranches(1);
  };

  /** Orden server-side: cambia el sort y vuelve a la primera página. */
  const setSort = async (sort: ServerSort) => {
    sortBy.value = sort.sortBy;
    sortDir.value = sort.sortDir ?? 'asc';
    await fetchBranches(1);
  };

  /** Tras crear/actualizar/eliminar, se queda en la página actual si sigue válida. */
  const refreshBranches = async () => {
    await fetchBranches(page.value > totalPages.value ? 1 : page.value);
  };

  const createBranch = async (payload: CreateBranchPayload) => {
    const result = await withLoading(async () => {
      const response = await branchService.createBranch(payload);
      await refreshBranches();
      return response.data;
    }, 'Error al crear la sede');
    return result;
  };

  const updateBranch = async (branchId: string, payload: UpdateBranchPayload) => {
    await withLoading(async () => {
      await branchService.updateBranch(branchId, payload);
      await refreshBranches();
    }, 'Error al actualizar la sede');
  };

  const deleteBranch = async (branchId: string) => {
    await withLoading(async () => {
      await branchService.deleteBranch(branchId);
      await refreshBranches();
    }, 'Error al eliminar la sede');
  };

  return {
    branches,
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
    fetchBranches,
    goToPage,
    setLimit,
    applyFilters,
    setSort,
    createBranch,
    updateBranch,
    deleteBranch,
  };
});
