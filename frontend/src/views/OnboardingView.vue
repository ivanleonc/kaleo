<template>
  <AuthLayout>
    <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
      <UiCard>
        <template #header>
          <h2 class="auth-title">Crea tu primera organización</h2>
          <p class="auth-description">
            Necesitas un espacio de trabajo para empezar. Podrás crear más después y
            cambiar entre ellas cuando quieras.
          </p>
        </template>

        <div class="form-body">
          <UiAlert v-if="companyStore.error" type="error">
            {{ companyStore.error }}
          </UiAlert>

          <UiAlert v-if="isSuccess" type="success">
            Organización creada. Te asignamos como propietario; redirigiendo a tu panel…
          </UiAlert>

          <template v-else>
            <UiInput
              v-model="form.name"
              label="Nombre de la organización"
              type="text"
              placeholder="Acme Corp"
              autocomplete="organization"
              :error="nameError"
              required
            />

            <UiInput
              v-model="form.tax_id"
              label="Tax ID / NIT / RFC (Opcional)"
              type="text"
              placeholder="Ej. TAX-12345"
              :error="taxIdError"
            />

            <p class="hint">
              Este nombre es visible para los miembros que invites. Puedes cambiarlo más
              adelante en Configuración.
            </p>
          </template>
        </div>

        <template #footer>
          <UiButton v-if="!isSuccess" type="submit" :loading="companyStore.isLoading">
            Crear Organización
          </UiButton>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { emptyToUndefined } from '@/utils/text';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const router = useRouter();
const authStore = useAuthStore();
const { companyId, companyDashboardPath } = useCompanyPath();
const companyStore = useCompanyStore();

/** Espejo de los límites de CreateCompanyDto para fallar antes de la red. */
const MAX_NAME_LENGTH = 100;
const MAX_TAX_ID_LENGTH = 50;

const form = reactive({
  name: '',
  tax_id: '',
});

/** Los errores solo se muestran tras el primer intento de envío. */
const submitted = ref(false);
const isSuccess = ref(false);

const nameError = computed(() => {
  if (!submitted.value) return null;
  const value = form.name.trim();
  if (value.length === 0) return 'El nombre es requerido.';
  if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (value.length > MAX_NAME_LENGTH) return `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  return null;
});

const taxIdError = computed(() => {
  if (!submitted.value) return null;
  if (form.tax_id.trim().length > MAX_TAX_ID_LENGTH) {
    return `Máximo ${MAX_TAX_ID_LENGTH} caracteres.`;
  }
  return null;
});

const hasErrors = computed(() => nameError.value !== null || taxIdError.value !== null);

onMounted(() => {
  if (companyId.value) {
    router.replace(companyDashboardPath());
  }
});

const handleSubmit = async () => {
  submitted.value = true;
  if (hasErrors.value) return;

  try {
    await companyStore.createCompany({
      name: form.name.trim(),
      tax_id: emptyToUndefined(form.tax_id),
    });
    isSuccess.value = true;
    // Los tokens del registro no traen tenants/roles: refrescar sesión
    await authStore.refreshTokens();
    await authStore.fetchProfile();
    if (companyId.value) {
      router.push(companyDashboardPath());
    }
  } catch {
    // Error manejado por el store (UiAlert)
  }
};
</script>

<style scoped>
.hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin: 0;
}
</style>
