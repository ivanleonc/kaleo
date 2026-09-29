<template>
  <AuthLayout>
    <UiCard>
      <template #header>
        <h2 class="auth-title">Verificar Correo</h2>
        <p class="auth-description">Estamos confirmando tu nueva dirección de correo.</p>
      </template>

      <div class="form-body">
        <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
        <UiAlert v-if="successMsg" type="success">{{ successMsg }}</UiAlert>
        <div v-if="isLoading" class="verify-loading" aria-label="Verificando">
          <span class="spinner"></span>
          <span>Verificando enlace...</span>
        </div>
      </div>

      <template #footer>
        <UiButton v-if="done" type="button" @click="goToLogin">
          Ir al inicio de sesión
        </UiButton>

        <div class="auth-footer-links">
          <p><router-link to="/login">Volver al inicio de sesión</router-link></p>
        </div>
      </template>
    </UiCard>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '@/services/auth.service';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import { apiErrorMessage } from '@/utils/error';

const route = useRoute();
const router = useRouter();

const isLoading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');
const done = ref(false);

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    errorMsg.value = 'Enlace de verificación inválido o incompleto.';
    isLoading.value = false;
    done.value = true;
    return;
  }

  try {
    const result = await authService.verifyEmail(token);
    successMsg.value = result.message || 'Correo verificado correctamente.';
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'El enlace caducó o es inválido.');
  } finally {
    isLoading.value = false;
    done.value = true;
  }
});

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.verify-loading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-sm);
  padding: var(--space-2) 0;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border);
  border-radius: 50%;
  border-top-color: var(--text-main);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
