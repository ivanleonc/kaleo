<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '@/services/auth.service';
import { passwordErrorMessage } from '@/utils/password';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import { apiErrorMessage } from '@/utils/error';

const route = useRoute();
const router = useRouter();

const token = ref((route.query.token as string) || '');
const email = ref((route.query.email as string) || '');
const password = ref('');
const passwordConfirm = ref('');

const isLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (!token.value || !email.value) {
    errorMsg.value = 'Enlace de recuperación inválido o incompleto.';
  }
});

onUnmounted(() => {
  if (redirectTimer) clearTimeout(redirectTimer);
});

const goToLogin = () => {
  if (redirectTimer) clearTimeout(redirectTimer);
  router.push('/login');
};

const handleSubmit = async () => {
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Las contraseñas no coinciden.';
    return;
  }

  const passwordError = passwordErrorMessage(password.value);
  if (passwordError) {
    errorMsg.value = passwordError;
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';

  try {
    await authService.resetPassword(email.value, token.value, password.value);
    successMsg.value = 'Tu contraseña ha sido actualizada. Redirigiendo...';
    redirectTimer = setTimeout(() => router.push('/login'), 3000);
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'El enlace caducó o es inválido.');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AuthLayout>
    <form @submit.prevent="handleSubmit" class="auth-form">
      <UiCard>
        <template #header>
          <h2 class="auth-title">Crear Nueva Contraseña</h2>
          <p class="auth-description">Ingresa una contraseña segura para tu cuenta.</p>
        </template>

        <div class="form-body">
          <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
          <UiAlert v-if="successMsg" type="success">{{ successMsg }}</UiAlert>

          <template v-if="!successMsg && token && email">
            <UiInput
              v-model="password"
              label="Nueva Contraseña"
              type="password"
              autocomplete="new-password"
              required
            />
            <UiInput
              v-model="passwordConfirm"
              label="Confirmar Contraseña"
              type="password"
              autocomplete="new-password"
              required
            />
          </template>
        </div>

        <template #footer>
          <UiButton v-if="successMsg" type="button" @click="goToLogin">
            Ir al inicio de sesión ahora
          </UiButton>
          <UiButton v-else-if="token && email" type="submit" :loading="isLoading">
            Actualizar Contraseña
          </UiButton>

          <div class="auth-footer-links">
            <p><router-link to="/login">Volver al inicio de sesión</router-link></p>
          </div>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>
