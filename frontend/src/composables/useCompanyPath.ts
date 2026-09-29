import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Resuelve la empresa activa desde una única fuente.
 *
 * Antes cada vista repetía el mismo fallback con órdenes distintos:
 *   `activeTenantId || user?.tenants?.[0]?.id`  (Login, Register, Onboarding)
 *   `tenants?.[0]?.id || activeTenantId`        (router, invertido)
 *   `companyId || activeTenantId || tenants?.[0]?.id`
 * Esa inconsistencia hacía que una misma vista despreciara la URL en un punto
 * y la respetara en otro.
 */
export function useCompanyPath() {
  const route = useRoute();
  const authStore = useAuthStore();

  /** Id de la ruta (dentro de /companies/:companyId/...). */
  const routeCompanyId = computed(() => {
    const value = route.params.companyId;
    return typeof value === 'string' ? value : undefined;
  });

  /** Tenant activo resuelto: ruta → store → primer tenant del usuario. */
  const companyId = computed<string | undefined>(
    () =>
      routeCompanyId.value ||
      authStore.activeTenantId ||
      authStore.user?.tenants?.[0]?.id ||
      undefined,
  );

  const companyPath = (suffix: string = '') => {
    return companyId.value ? `/companies/${companyId.value}${suffix}` : '';
  };

  const companyDashboardPath = () => companyPath('/dashboard');

  /** Tenant activo resuelto a objeto, usando el getter del store. */
  const company = computed(() => authStore.currentTenant ?? undefined);

  return { companyId, routeCompanyId, companyPath, companyDashboardPath, company };
}
