<template>
  <AuthLayout>
    <form @submit.prevent="handleRegister" class="auth-form">
      <UiCard>
        <template #header>
          <h2 class="auth-title">Crear Cuenta</h2>
          <p class="auth-description">Ingresa los datos de tu empresa para comenzar.</p>
        </template>

        <div class="form-body">
          <UiAlert v-if="authStore.error" type="error">
            {{ authStore.error }}
          </UiAlert>

          <UiInput
            v-model="form.name"
            label="Tu nombre"
            type="text"
            placeholder="Juan Pérez"
            autocomplete="name"
            required
          />

          <UiInput
            v-model="form.email"
            label="Correo electrónico"
            type="email"
            placeholder="contacto@acme.com"
            autocomplete="email"
            required
          />

          <UiInput
            v-model="form.password"
            label="Contraseña"
            type="password"
            autocomplete="new-password"
            required
          />

          <UiInput
            v-model="form.passwordConfirm"
            label="Confirmar contraseña"
            type="password"
            autocomplete="new-password"
            :error="form.passwordConfirm && form.password !== form.passwordConfirm
              ? 'Las contraseñas no coinciden.'
              : null"
            required
          />
        </div>

        <template #footer>
          <UiButton type="submit" :loading="authStore.isLoading">
            Registrarse
          </UiButton>
          
          <div class="auth-footer-links">
            <p><router-link to="/forgot-password">¿Olvidaste tu contraseña?</router-link></p>
            <p>¿Ya tienes cuenta? <router-link to="/login">Inicia sesión</router-link></p>
          </div>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { passwordErrorMessage } from '@/utils/password';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const authStore = useAuthStore();
const router = useRouter();
const { companyId, companyDashboardPath } = useCompanyPath();

const form = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirm: ''
});

const handleRegister = async () => {
  if (form.password !== form.passwordConfirm) {
    authStore.error = 'Las contraseñas no coinciden.';
    return;
  }

  const passwordError = passwordErrorMessage(form.password);
  if (passwordError) {
    authStore.error = passwordError;
    return;
  }

  try {
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password
    });
    if (!companyId.value) {
      router.push({ name: 'Onboarding' });
      return;
    }
    router.push(companyDashboardPath());
  } catch (error) {
    // Error manejado por Pinia
  }
};
</script>
