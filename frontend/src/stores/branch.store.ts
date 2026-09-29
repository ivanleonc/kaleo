import { defineStore } from 'pinia';
import { ref } from 'vue';
import { branchService } from '@/services/branch.service';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '@/types/branch';

export const useBranchStore = defineStore('branch', () => {
  const branches = ref<Branch[]>([]);

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error en la operación' });

  const fetchBranches = async () => {
    await withLoading(async () => {
      const response = await branchService.getBranches();
      branches.value = response.data;
    }, 'Error al cargar las sedes');
  };

  const createBranch = async (payload: CreateBranchPayload) => {
    const result = await withLoading(async () => {
      const response = await branchService.createBranch(payload);
      await fetchBranches();
      return response.data;
    }, 'Error al crear la sede');
    return result;
  };

  const updateBranch = async (branchId: string, payload: UpdateBranchPayload) => {
    await withLoading(async () => {
      await branchService.updateBranch(branchId, payload);
      await fetchBranches();
    }, 'Error al actualizar la sede');
  };

  const deleteBranch = async (branchId: string) => {
    await withLoading(async () => {
      await branchService.deleteBranch(branchId);
      await fetchBranches();
    }, 'Error al eliminar la sede');
  };

  return { branches, isLoading, error, fetchBranches, createBranch, updateBranch, deleteBranch };
});
