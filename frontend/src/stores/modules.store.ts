import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { EnabledModule } from '@saas/shared';
import { moduleService } from '@/services/module.service';

/**
 * Módulos habilitados para la empresa activa.
 *
 * Los `core.*` son always-on: `isEnabled` los deja pasar aunque la carga
 * todavía no haya terminado. Los módulos de pack solo aparecen si el backend
 * los devuelve como habilitados.
 */
export const useModulesStore = defineStore('modules', () => {
  const modules = ref<EnabledModule[]>([]);
  const isLoading = ref(false);
  const loadedCompanyId = ref<string | null>(null);
  const error = ref<string | null>(null);

  const enabledCodes = computed(() => new Set(modules.value.map((m) => m.code)));

  async function load(companyId: string, force = false): Promise<void> {
    if (!force && loadedCompanyId.value === companyId && modules.value.length > 0) return;

    isLoading.value = true;
    error.value = null;
    try {
      const response = await moduleService.getModules();
      modules.value = response.data;
      loadedCompanyId.value = companyId;
    } catch (err: any) {
      modules.value = [];
      loadedCompanyId.value = null;
      error.value = err?.response?.data?.message ?? 'No se pudieron cargar los módulos';
    } finally {
      isLoading.value = false;
    }
  }

  function reset(): void {
    modules.value = [];
    loadedCompanyId.value = null;
    error.value = null;
  }

  function isEnabled(code: string): boolean {
    if (code.startsWith('core.')) return true;
    return enabledCodes.value.has(code);
  }

  return {
    modules,
    isLoading,
    error,
    load,
    reset,
    isEnabled,
  };
});
