import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { resolveTenantByParam, tenantUrlParam } from '@/utils/tenant';

/**
 * Resuelve la empresa activa desde una única fuente.
 *
 * La URL (`/companies/:companyId/...`) puede traer el slug canónico o, por
 * compatibilidad, el UUID viejo. `companyId` es siempre el UUID (lo que usa el
 * header `x-company-id`), mientras que `companyPath()` arma la URL con el slug
 * cuando existe.
 */
export function useCompanyPath() {
  const route = useRoute();
  const authStore = useAuthStore();

  /** Valor crudo del parámetro de ruta (slug o UUID). */
  const routeCompanyParam = computed<string | undefined>(() => {
    const value = route.params.companyId;
    return typeof value === 'string' ? value : undefined;
  });

  /** Tenant resuelto desde la URL (slug → id). */
  const routeTenant = computed(() => resolveTenantByParam(authStore.user?.tenants, routeCompanyParam.value));

  /** UUID de la empresa activa: ruta → store → primer tenant del usuario. */
  const companyId = computed<string | undefined>(
    () =>
      routeTenant.value?.id ||
      authStore.activeTenantId ||
      authStore.user?.tenants?.[0]?.id ||
      undefined,
  );

  /** Tenant activo resuelto a objeto. */
  const company = computed(
    () =>
      routeTenant.value ??
      authStore.currentTenant ??
      authStore.user?.tenants?.find((t) => t.id === companyId.value) ??
      undefined,
  );

  /** Valor para la URL: slug del tenant activo, con fallback a UUID. */
  const companyUrlParam = computed(() => tenantUrlParam(company.value) ?? companyId.value);

  const companyPath = (suffix: string = '') => {
    return companyUrlParam.value ? `/companies/${companyUrlParam.value}${suffix}` : '';
  };

  const companyDashboardPath = () => companyPath('/dashboard');

  return {
    companyId,
    routeCompanyId: routeCompanyParam,
    routeCompanyParam,
    routeTenant,
    companyUrlParam,
    companyPath,
    companyDashboardPath,
    company,
  };
}
