<template>
  <AuthenticatedLayout>
    <div class="change-password-container">
      <UiPageHeader
        title="Cambiar Contraseña"
        :subtitle="isTemporary
          ? 'Tu contraseña es temporal. Debes cambiarla para continuar usando el sistema.'
          : 'Actualiza tu contraseña de acceso.'"
      />

      <UiAlert v-if="isTemporary" type="warning">
        Debes cambiar tu contraseña temporal antes de acceder al resto del sistema.
      </UiAlert>

      <form @submit.prevent="handleSubmit">
        <UiCard>
          <template #header>
            <h3 class="card-title">{{ isTemporary ? 'Nueva Contraseña' : 'Cambiar Contraseña' }}</h3>
          </template>

          <div class="form-body">
            <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
            <UiAlert v-if="successMsg" type="success">{{ successMsg }}</UiAlert>

            <UiInput
              v-if="!isTemporary"
              v-model="form.currentPassword"
              label="Contraseña Actual"
              type="password"
              autocomplete="current-password"
              required
            />
            <UiInput
              v-model="form.newPassword"
              label="Nueva Contraseña"
              type="password"
              autocomplete="new-password"
              required
            />

            <UiPasswordStrength v-model="form.newPassword" />

            <UiInput
              v-model="form.confirmPassword"
              label="Confirmar Nueva Contraseña"
              type="password"
              autocomplete="new-password"
              required
            />

            <p v-if="form.confirmPassword && form.newPassword !== form.confirmPassword" class="match-error">
              Las contraseñas no coinciden.
            </p>
          </div>

          <template #footer>
            <UiButton
              type="submit"
              :loading="isLoading"
            >
              {{ isTemporary ? 'Establecer Contraseña' : 'Actualizar Contraseña' }}
            </UiButton>
          </template>
        </UiCard>
      </form>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { authService } from '@/services/auth.service';
import { isPasswordValid, passwordErrorMessage } from '@/utils/password';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiPasswordStrength from '@/components/ui/UiPasswordStrength.vue';
import { apiErrorMessage } from '@/utils/error';

const authStore = useAuthStore();
const router = useRouter();
const { companyPath } = useCompanyPath();

const isLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const isTemporary = computed(() => !!authStore.user?.must_change_password);

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Password strength
const handleSubmit = async () => {
  if (!isTemporary.value && !form.currentPassword) {
    errorMsg.value = 'Ingresa tu contraseña actual.';
    return;
  }

  if (form.newPassword !== form.confirmPassword) {
    errorMsg.value = 'Las contraseñas no coinciden.';
    return;
  }

  const passwordError = passwordErrorMessage(form.newPassword);
  if (passwordError) {
    errorMsg.value = passwordError;
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const wasTemporary = isTemporary.value;
    if (wasTemporary) {
      await authService.changeTemporaryPassword(form.newPassword);
    } else {
      await authService.changePassword(form.currentPassword, form.newPassword);
    }

    if (authStore.user) {
      authStore.user.must_change_password = false;
    }

    form.currentPassword = '';
    form.newPassword = '';
    form.confirmPassword = '';

    // 2500ms mínimo: el mensaje de éxito debe ser legible antes de redirigir,
    // incluyendo usuarios con lector de pantalla.
    if (wasTemporary) {
      successMsg.value = 'Contraseña actualizada. Inicia sesión con tu nueva contraseña...';
      setTimeout(async () => {
        await authStore.logout();
        router.push({ name: 'Login' });
      }, 2500);
    } else {
      successMsg.value = 'Contraseña actualizada correctamente. Redirigiendo...';
      setTimeout(() => router.push(companyPath('/dashboard')), 2500);
    }
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'Error al cambiar contraseña');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.change-password-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: 500px;
}

.match-error {
  font-size: var(--text-xs);
  color: var(--color-danger);
  margin: 0;
}
</style>
