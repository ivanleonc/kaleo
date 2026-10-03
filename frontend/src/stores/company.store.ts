import { defineStore } from 'pinia';
import { ref } from 'vue';
import { companyService } from '@/services/company.service';
import { useAuthStore } from './auth.store';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { UpdateCompanyPayload } from '@/types/company';

export interface CompanySummary {
  id: string;
  name: string;
  slug: string | null;
  tax_id: string | null;
  is_active: boolean;
  member_count: number;
  /**
   * Siempre []: es un marcador para compatibilidad estructural con Tenant
   * (el super-admin no tiene roles materiales en empresas ajenas; el acceso
   * es virtual vía bypass de guards).
   */
  roles: string[];
}

export const useCompanyStore = defineStore('company', () => {
  const authStore = useAuthStore();

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error en la operación' });

  /** Todas las empresas del sistema (solo super-admin, para el switcher). */
  const allCompanies = ref<CompanySummary[]>([]);
  /**
   * Indica si ya se intentó cargar `allCompanies` en esta sesión.
   * Evita refetch en cada navegación del router guard: una vez cargada
   * (o fallida), la resolución de tenants usa caché.
   */
  const allCompaniesLoaded = ref(false);

  const updateCompany = async (companyId: string, payload: UpdateCompanyPayload) => {
    return withLoading(async () => {
      const result = await companyService.updateCompany(companyId, payload);

      if (authStore.user && authStore.user.tenants) {
        const tenant = authStore.user.tenants.find((t) => t.id === companyId);
        if (tenant) {
          if (payload.name) tenant.name = payload.name;
          if (payload.tax_id !== undefined) tenant.tax_id = payload.tax_id;
          if (payload.slug !== undefined) tenant.slug = payload.slug;
        }
      }

      return result;
    }, 'Error al actualizar la empresa');
  };

  const createCompany = async (payload: { name: string; tax_id?: string }) => {
    return withLoading(async () => {
      const result = await companyService.createCompany(payload);
      const newCompany = result.data.company;

      if (authStore.user) {
        const newTenant = {
          id: newCompany.id,
          name: newCompany.name,
          tax_id: newCompany.tax_id,
          slug: newCompany.slug ?? null,
          roles: ['Owner'],
        };

        if (!authStore.user.tenants) authStore.user.tenants = [];
        authStore.user.tenants.push(newTenant);
        authStore.setActiveTenant(newCompany.id);
      }

      return result;
    }, 'Error al crear la empresa');
  };

  /**
   * Carga todas las empresas (solo super-admin). No-op silencioso para el
   * resto: el backend responde 403 y no queremos ensuciar `error` global.
   */
  const fetchAllCompanies = async (): Promise<CompanySummary[]> => {
    if (!authStore.isSuperAdmin) {
      allCompanies.value = [];
      allCompaniesLoaded.value = true;
      return [];
    }
    try {
      const response = await companyService.getAllCompanies();
      allCompanies.value = (response.data ?? []).map((c) => ({ ...c, roles: [] }));
    } catch {
      allCompanies.value = [];
    } finally {
      allCompaniesLoaded.value = true;
    }
    return allCompanies.value;
  };

  return { isLoading, error, allCompanies, allCompaniesLoaded, updateCompany, createCompany, fetchAllCompanies };
});
