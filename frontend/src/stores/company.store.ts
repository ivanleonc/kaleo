import { defineStore } from 'pinia';
import { companyService } from '@/services/company.service';
import { useAuthStore } from './auth.store';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { UpdateCompanyPayload } from '@/types/company';

export const useCompanyStore = defineStore('company', () => {
  const authStore = useAuthStore();

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error en la operación' });

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

  return { isLoading, error, updateCompany, createCompany };
});
