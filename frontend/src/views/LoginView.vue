<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { STORAGE_KEYS } from '@/utils/storage-keys';
import { useCompanyPath } from '@/composables/useCompanyPath';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const authStore = useAuthStore();
const router = useRouter();
const { companyId, companyDashboardPath } = useCompanyPath();

const form = reactive({
  email: '',
  password: ''
});

const sessionExpired = ref(false);
const emailTouched = ref(false);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const loginEmailError = computed(() =>
  emailTouched.value && form.email && !emailRegex.test(form.email)
    ? 'Correo electrónico inválido.'
    : null
);

onMounted(() => {
  if (sessionStorage.getItem(STORAGE_KEYS.sessionExpired) === '1') {
    sessionStorage.removeItem(STORAGE_KEYS.sessionExpired);
    sessionExpired.value = true;
  }
});

const handleLogin = async () => {
  try {
    await authStore.login({ email: form.email.trim(), password: form.password });
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

<template>
  <AuthLayout>
    <form @submit.prevent="handleLogin" class="auth-form">
      <UiCard>
        <template #header>
          <h2 class="auth-title">Iniciar Sesión</h2>
          <p class="auth-description">Ingresa tus credenciales para acceder a tu cuenta.</p>
        </template>

        <div class="form-body">
          <UiAlert v-if="authStore.error" type="error">
            {{ authStore.error }}
          </UiAlert>
          <UiAlert v-if="sessionExpired && !authStore.error" type="info">
            Tu sesión expiró. Inicia sesión de nuevo.
          </UiAlert>

          <UiInput
            v-model="form.email"
            label="Correo electrónico"
            type="email"
            placeholder="nombre@empresa.com"
            autocomplete="email"
            name="email"
            :error="loginEmailError"
            @blur="emailTouched = true"
            required
          />

          <UiInput
            v-model="form.password"
            label="Contraseña"
            type="password"
            autocomplete="current-password"
            name="password"
            required
          />
        </div>

        <template #footer>
          <UiButton type="submit" :loading="authStore.isLoading">
            Ingresar
          </UiButton>
          
          <div class="auth-footer-links">
            <p><router-link to="/forgot-password">¿Olvidaste tu contraseña?</router-link></p>
            <p>¿No tienes una cuenta? <router-link to="/register">Regístrate</router-link></p>
          </div>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>
