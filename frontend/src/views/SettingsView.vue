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

      <UiCard v-if="isLoadingDetail" aria-hidden="true">
        <template #header>
          <div class="company-hero">
            <UiSkeleton variant="avatar" width="48px" height="48px" radius="var(--radius-lg)" />
            <div class="skeleton-hero-text">
              <UiSkeleton variant="title" width="180px" />
              <UiSkeleton variant="text" width="120px" />
            </div>
          </div>
        </template>
        <div class="info-grid">
          <div v-for="n in 5" :key="n" class="info-row">
            <UiSkeleton variant="text" width="120px" />
            <UiSkeleton variant="text" width="160px" />
          </div>
        </div>
      </UiCard>

      <UiErrorState
        v-else-if="detailError"
        title="No pudimos cargar la empresa"
        :description="detailError"
        @retry="loadCompanyData"
      />

      <UiEmptyState
        v-else-if="!company"
        title="Sin empresa cargada"
        description="No se pudo obtener la información de la empresa."
      />

      <template v-else-if="company">
        <UiCard>
          <template #header>
            <div class="company-hero">
              <UiAvatar :src="company.logo_url" :name="company.name" size="lg" loading="eager" />
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
      <UiFormModal
        v-model="isEditModalOpen"
        title="Editar Empresa"
        description="Actualiza la información de tu organización."
        :confirm-on-dirty="true"
        :dirty="isFormDirty"
        @submit="handleSubmit"
      >
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
          <div class="slug-field">
            <UiInput
              v-model="form.slug"
              label="Identificador (slug)"
              placeholder="mi-empresa"
              :error="slugError"
            />
            <p class="slug-preview">
              URL: /companies/{{ form.slug || 'se-genera-automaticamente' }}/settings
            </p>
            <UiAlert v-if="slugChangedWarning" type="warning" class="slug-warning">
              {{ slugChangedWarning }}
            </UiAlert>
          </div>
        </div>

        <UiInput
          v-model="form.logo_url"
          label="URL del Logo"
          placeholder="https://..."
          type="url"
        />
        <div v-if="form.logo_url.trim()" class="logo-preview">
          <img
            :src="form.logo_url.trim()"
            alt="Vista previa del logo de la empresa"
            @load="logoBroken = false"
            @error="logoBroken = true"
          />
          <p v-if="logoBroken" class="logo-preview-error">
            Esta URL no cargó ninguna imagen. Revisa el enlace antes de guardar.
          </p>
        </div>

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

        <UiTimezoneSelect v-model="form.timezone" />

        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">
              Cancelar
            </UiButton>
            <UiButton type="submit" :loading="companyStore.isLoading">
              Guardar Cambios
            </UiButton>
          </div>
        </template>
      </UiFormModal>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiTimezoneSelect from '@/components/ui/UiTimezoneSelect.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import { IconEdit } from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { emptyToUndefined } from '@/utils/text';
import { apiErrorMessage } from '@/utils/error';
import { Permissions } from '@/constants/permissions';

const companyStore = useCompanyStore();
const authStore = useAuthStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const { companyId, companyPath } = useCompanyPath();

const isEditModalOpen = ref(false);
const isLoadingDetail = ref(false);
const detailError = ref<string | null>(null);
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

const fillForm = () => {
  if (!company.value) return;
  logoBroken.value = false;
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

const { isDirty: isFormDirty, capture: snapshotForm } = useDirtyForm(() => ({ ...form }));

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugError = computed(() => {
  const value = form.slug.trim();
  if (!value) return null; // vacío = se regenera desde el nombre
  if (value.length > 100) return 'Máximo 100 caracteres';
  if (!slugPattern.test(value)) return 'Solo minúsculas, números y guiones';
  return null;
});

// Cambiar el slug rompe bookmarks e integraciones: avisar antes de guardar.
const slugChangedWarning = computed(() => {
  const next = form.slug.trim().toLowerCase();
  const current = (company.value?.slug || '').toLowerCase();
  if (!next || !current || next === current || slugError.value) return null;
  return 'Cambiar el identificador actualizará la URL de la empresa. Los enlaces y marcadores anteriores dejarán de funcionar.';
});

const logoBroken = ref(false);

const loadCompanyData = async () => {
  const activeId = companyId.value;
  if (!activeId) return;
  isLoadingDetail.value = true;
  detailError.value = null;
  try {
    const result = await companyService.getCompany(activeId);
    company.value = result.data;
    fillForm();
  } catch (error) {
    detailError.value = apiErrorMessage(error, 'No pudimos cargar la empresa');
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
  if (!companyId.value) return;
  if (slugError.value) return;

  try {
    const result = await companyStore.updateCompany(companyId.value, {
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
      slug: form.slug.trim() ? form.slug.trim().toLowerCase() : null,
    });

    if (result && (result as CompanyDetail).id) {
      company.value = result as CompanyDetail;
      authStore.updateTenant(companyId.value, {
        name: company.value.name,
        tax_id: company.value.tax_id,
        slug: company.value.slug,
      });
    } else {
      await loadCompanyData();
    }

    isEditModalOpen.value = false;
    toast.success('Empresa actualizada correctamente');

    // Canoniza la URL al slug guardado: la ruta con el slug viejo ya no resolvería.
    const target = companyPath('/settings');
    if (target && target !== route.path) {
      router.replace(target);
    }
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
  text-align: right;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}

.company-hero {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.skeleton-hero-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.slug-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.slug-preview {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  word-break: break-all;
}

.slug-warning {
  margin-top: var(--space-1);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-preview img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background-color: var(--bg-app);
}

.logo-preview-error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-danger-text);
  line-height: 1.4;
}
</style>
