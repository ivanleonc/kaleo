import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { EntitlementsSnapshot } from '@saas/shared';
import { entitlementService } from '@/services/entitlement.service';

/** Snapshot de plan/límites de la empresa activa para el shell. */
export const useEntitlementsStore = defineStore('entitlements', () => {
  const snapshot = ref<EntitlementsSnapshot | null>(null);
  const isLoading = ref(false);
  const loadedCompanyId = ref<string | null>(null);
  const error = ref<string | null>(null);

  const isReadOnly = computed(() => snapshot.value?.readOnly ?? false);
  const trialEndsAt = computed(() => snapshot.value?.trialEndsAt ?? null);

  async function load(companyId: string, force = false): Promise<void> {
    if (!force && loadedCompanyId.value === companyId && snapshot.value) return;

    isLoading.value = true;
    error.value = null;
    try {
      const response = await entitlementService.getSnapshot();
      snapshot.value = response.data;
      loadedCompanyId.value = companyId;
    } catch (err: any) {
      snapshot.value = null;
      loadedCompanyId.value = null;
      error.value = err?.response?.data?.message ?? 'No se pudo cargar el plan';
    } finally {
      isLoading.value = false;
    }
  }

  function reset(): void {
    snapshot.value = null;
    loadedCompanyId.value = null;
    error.value = null;
  }

  return {
    snapshot,
    isLoading,
    error,
    isReadOnly,
    trialEndsAt,
    load,
    reset,
  };
});
