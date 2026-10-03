import { defineStore } from 'pinia';
import { branchService } from '@/services/branch.service';
import { usePaginatedSetup } from '@/composables/createPaginatedStore';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '@/types/branch';

export interface BranchFilters extends Record<string, unknown> {
  search?: string;
  status?: string;
}

export const useBranchStore = defineStore('branch', () => {
  // ---------------------------------------------------------------------------
  // Paginación base (paginación, filtros, sort, reset por empresa)
  // ---------------------------------------------------------------------------
  const paginated = usePaginatedSetup<Branch, BranchFilters>({
    fetchFn: branchService.getBranches.bind(branchService),
    defaultFilters: { search: undefined, status: undefined },
  });

  // Alias de compatibilidad: las views usan `branchStore.branches` y
  // `branchStore.fetchBranches()` — no hay que tocar ningún consumidor.
  const branches = paginated.items;
  const fetchBranches = (targetPage?: number) => paginated.fetch(targetPage);

  // ---------------------------------------------------------------------------
  // CRUD de dominio
  // ---------------------------------------------------------------------------

  const createBranch = async (payload: CreateBranchPayload) => {
    const result = await paginated.withLoading(async () => {
      const response = await branchService.createBranch(payload);
      await paginated.refresh();
      return response.data;
    }, 'Error al crear la sede');
    return result;
  };

  const updateBranch = async (branchId: string, payload: UpdateBranchPayload) => {
    await paginated.withLoading(async () => {
      await branchService.updateBranch(branchId, payload);
      await paginated.refresh();
    }, 'Error al actualizar la sede');
  };

  const deleteBranch = async (branchId: string) => {
    await paginated.withLoading(async () => {
      await branchService.deleteBranch(branchId);
      await paginated.refresh();
    }, 'Error al eliminar la sede');
  };

  return {
    // --- Paginación base ---
    ...paginated,
    // --- Alias de compatibilidad ---
    branches,
    fetchBranches,
    // --- CRUD de dominio ---
    createBranch,
    updateBranch,
    deleteBranch,
  };
});
