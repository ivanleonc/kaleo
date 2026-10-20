import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { energyService } from '@/services/energy.service';
import { apiErrorMessage } from '@/utils/error';
import type { EnergyDashboard } from '@/types/energy';

function isCanceled(error: unknown): boolean {
  return (
    (error as { code?: string })?.code === 'ERR_CANCELED' ||
    (error as { name?: string })?.name === 'CanceledError'
  );
}

export const useEnergyStore = defineStore('energy', () => {
  const authStore = useAuthStore();

  const dashboard = ref<EnergyDashboard | null>(null);
  const isUploading = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);
  const pendingFileName = ref<string | null>(null);

  let requestId = 0;
  let controller: AbortController | null = null;

  const hasData = computed(() => dashboard.value !== null);
  const isMock = computed(() => dashboard.value?.meta.source === 'mock');

  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    requestId += 1;
    controller?.abort();
    controller = null;
    dashboard.value = null;
    isUploading.value = false;
    progress.value = 0;
    error.value = null;
    pendingFileName.value = null;
  };

  const upload = async (file: File): Promise<EnergyDashboard | null> => {
    const currentRequestId = ++requestId;
    controller?.abort();
    controller = new AbortController();

    isUploading.value = true;
    progress.value = 0;
    error.value = null;
    pendingFileName.value = file.name;

    try {
      const result = await energyService.uploadExcel(file, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (currentRequestId === requestId) progress.value = percent;
        },
      });

      if (currentRequestId !== requestId) return null;

      dashboard.value = result;
      progress.value = 100;
      return result;
    } catch (err: unknown) {
      if (currentRequestId !== requestId || isCanceled(err)) return null;

      error.value = apiErrorMessage(
        err,
        'No pudimos procesar el archivo. Verifica el formato e inténtalo de nuevo.',
      );
      return null;
    } finally {
      if (currentRequestId === requestId) {
        isUploading.value = false;
        pendingFileName.value = null;
        controller = null;
      }
    }
  };

  watch(
    () => authStore.activeTenantId,
    () => reset(),
  );

  return {
    dashboard,
    isUploading,
    progress,
    error,
    pendingFileName,
    hasData,
    isMock,
    upload,
    clearError,
    reset,
  };
});
