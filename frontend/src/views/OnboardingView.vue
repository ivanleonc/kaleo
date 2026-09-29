<template>
  <AuthLayout>
    <form @submit.prevent="handleSubmit" class="auth-form">
      <UiCard>
        <template #header>
          <h2 class="auth-title">Crea tu primera organización</h2>
          <p class="auth-description">Necesitas un espacio de trabajo para empezar. Podrás crear más después.</p>
        </template>

        <div class="form-body">
          <UiAlert v-if="companyStore.error" type="error">
            {{ companyStore.error }}
          </UiAlert>

          <UiInput
            v-model="form.name"
            label="Nombre de la organización"
            type="text"
            placeholder="Acme Corp"
            autocomplete="organization"
            required
          />

          <UiInput
            v-model="form.tax_id"
            label="Tax ID / NIT / RFC (Opcional)"
            type="text"
            placeholder="Ej. TAX-12345"
          />
        </div>

        <template #footer>
          <UiButton type="submit" :loading="companyStore.isLoading">
            Crear Organización
          </UiButton>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const router = useRouter();
const authStore = useAuthStore();
const { companyId, companyDashboardPath } = useCompanyPath();
const companyStore = useCompanyStore();

const form = reactive({
  name: '',
  tax_id: ''
});

onMounted(() => {
  if (companyId.value) {
    router.replace(companyDashboardPath());
  }
});

const handleSubmit = async () => {
  try {
    await companyStore.createCompany({
      name: form.name.trim(),
      tax_id: form.tax_id.trim() || undefined
    });
    // Los tokens del registro no traen tenants/roles: refrescar sesión
    await authStore.refreshTokens();
    await authStore.fetchProfile();
    if (companyId.value) {
      router.push(companyDashboardPath());
    }
  } catch (error) {
    // Error manejado por el store (UiAlert)
  }
};
</script>
