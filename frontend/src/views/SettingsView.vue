<template>
  <AuthenticatedLayout>
    <div class="settings-container">
      <UiPageHeader
        title="Configuración de la Empresa"
        subtitle="Administra la información general y fiscal de tu organización."
      >
        <template #actions>
          <UiButton v-permission="Permissions.COMPANY.UPDATE" @click="openEditModal" width="auto">
            <IconEdit :size="16" /> Editar Empresa
          </UiButton>
        </template>
      </UiPageHeader>

      <div v-if="isLoadingDetail" class="loading-state">Cargando datos...</div>

      <template v-else-if="company">
        <UiCard>
          <template #header>
            <div class="company-hero">
              <div class="company-logo">
                <img v-if="company.logo_url" :src="company.logo_url" alt="Logo de la empresa" />
                <span v-else>{{ getInitials(company.name) }}</span>
              </div>
              <div>
                <h3 class="card-title">{{ company.name }}</h3>
                <p v-if="company.slug" class="card-description">{{ company.slug }}</p>
              </div>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Tax ID / NIT / RFC</span>
              <span class="info-value">{{ company.tax_id || 'No configurado' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono</span>
              <span class="info-value">{{ company.phone || 'No configurado' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">{{ company.email || 'No configurado' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dirección</span>
              <span class="info-value">{{ fullAddress || 'No configurada' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Zona Horaria</span>
              <span class="info-value">{{ company.timezone || 'No configurada' }}</span>
            </div>
          </div>
        </UiCard>
      </template>

      <!-- Edit Modal -->
      <UiModal v-model="isEditModalOpen" :confirm-on-dirty="true" :dirty="isFormDirty">
        <form @submit.prevent="handleSubmit">
          <UiCard>
            <template #header>
              <h3 class="card-title">Editar Empresa</h3>
              <p class="card-description">Actualiza la información de tu organización.</p>
            </template>
            
            <div class="form-body">
              <UiAlert v-if="companyStore.error" type="error">{{ companyStore.error }}</UiAlert>

              <UiInput
                v-model="form.name"
                label="Nombre de la Empresa"
                required
              />

              <div class="form-row">
                <UiInput
                  v-model="form.tax_id"
                  label="Tax ID / NIT / RFC"
                  placeholder="Ej. TAX-12345"
                />
                <UiInput
                  v-model="form.slug"
                  label="Identificador (slug)"
                  placeholder="mi-empresa"
                />
              </div>

              <UiInput
                v-model="form.logo_url"
                label="URL del Logo"
                placeholder="https://..."
              />

              <div class="form-row">
                <UiInput v-model="form.phone" label="Teléfono" autocomplete="tel" />
                <UiInput v-model="form.email" label="Email" type="email" autocomplete="email" />
              </div>

              <UiInput v-model="form.address" label="Dirección" autocomplete="street-address" />

              <div class="form-row">
                <UiInput v-model="form.city" label="Ciudad" autocomplete="address-level2" />
                <UiInput v-model="form.state" label="Estado / Departamento" autocomplete="address-level1" />
              </div>

              <div class="form-row">
                <UiInput v-model="form.country" label="País" autocomplete="country-name" />
                <UiInput v-model="form.postal_code" label="Código Postal" autocomplete="postal-code" />
              </div>

              <UiInput
                v-model="form.timezone"
                label="Zona Horaria"
                placeholder="America/Bogota"
              />
            </div>

            <template #footer>
              <div class="modal-footer">
                <UiButton type="button" variant="outline" @click="isEditModalOpen = false">
                  Cancelar
                </UiButton>
                <UiButton type="submit" :loading="companyStore.isLoading">
                  Guardar Cambios
                </UiButton>
              </div>
            </template>
          </UiCard>
        </form>
      </UiModal>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useCompanyStore } from '@/stores/company.store';
import { useAuthStore } from '@/stores/auth.store';
import { companyService } from '@/services/company.service';
import type { CompanyDetail } from '@/types/company';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiModal from '@/components/ui/UiModal.vue';
import { IconEdit } from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';
import { Permissions } from '@/constants/permissions';

const companyStore = useCompanyStore();
const authStore = useAuthStore();
const toast = useToast();

const isEditModalOpen = ref(false);
const isLoadingDetail = ref(false);
const company = ref<CompanyDetail | null>(null);
const form = reactive({
  name: '',
  tax_id: '',
  logo_url: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  timezone: '',
  slug: '',
});

const fullAddress = computed(() => {
  if (!company.value) return '';
  return [company.value.address, company.value.city, company.value.state, company.value.country]
    .filter(Boolean)
    .join(', ');
});

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
};

const fillForm = () => {
  if (!company.value) return;
  form.name = company.value.name || '';
  form.tax_id = company.value.tax_id || '';
  form.logo_url = company.value.logo_url || '';
  form.phone = company.value.phone || '';
  form.email = company.value.email || '';
  form.address = company.value.address || '';
  form.city = company.value.city || '';
  form.state = company.value.state || '';
  form.country = company.value.country || '';
  form.postal_code = company.value.postal_code || '';
  form.timezone = company.value.timezone || '';
  form.slug = company.value.slug || '';
};

const formSnapshot = ref('');

const snapshotForm = () => {
  formSnapshot.value = JSON.stringify({ ...form });
};

const isFormDirty = computed(() => JSON.stringify({ ...form }) !== formSnapshot.value);

const emptyToUndefined = (value: string): string | undefined =>
  value.trim() === '' ? undefined : value.trim();

const loadCompanyData = async () => {
  const activeId = authStore.activeTenantId;
  if (!activeId) return;
  isLoadingDetail.value = true;
  try {
    const result = await companyService.getCompany(activeId);
    company.value = result.data;
    fillForm();
  } catch (error) {
    console.error('Error al cargar la empresa:', error);
  } finally {
    isLoadingDetail.value = false;
  }
};

onMounted(() => {
  loadCompanyData();
});

watch(() => authStore.activeTenantId, () => {
  company.value = null;
  loadCompanyData();
  companyStore.error = null;
});

const openEditModal = () => {
  fillForm();
  companyStore.error = null;
  snapshotForm();
  isEditModalOpen.value = true;
};

const handleSubmit = async () => {
  if (!authStore.activeTenantId) return;

  try {
    const result = await companyStore.updateCompany(authStore.activeTenantId, {
      name: form.name,
      tax_id: emptyToUndefined(form.tax_id),
      logo_url: emptyToUndefined(form.logo_url),
      phone: emptyToUndefined(form.phone),
      email: emptyToUndefined(form.email),
      address: emptyToUndefined(form.address),
      city: emptyToUndefined(form.city),
      state: emptyToUndefined(form.state),
      country: emptyToUndefined(form.country),
      postal_code: emptyToUndefined(form.postal_code),
      timezone: emptyToUndefined(form.timezone),
      slug: emptyToUndefined(form.slug)?.toLowerCase(),
    });

    if (result && (result as CompanyDetail).id) {
      company.value = result as CompanyDetail;
      const tenant = authStore.user?.tenants?.find((t: any) => t.id === authStore.activeTenantId);
      if (tenant) {
        tenant.name = company.value.name;
        tenant.tax_id = company.value.tax_id;
      }
    } else {
      await loadCompanyData();
    }

    isEditModalOpen.value = false;
    toast.success('Empresa actualizada correctamente');
  } catch (error) {
    // Error manejado por UiAlert
  }
};
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.info-grid {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-weight: 500;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--text-main);
  font-weight: 600;
}

.company-hero {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.company-logo {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: var(--bg-app);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-main);
  flex-shrink: 0;
  overflow: hidden;
}

.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
