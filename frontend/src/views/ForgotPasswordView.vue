<script setup lang="ts">
import { ref } from 'vue';
import { authService } from '@/services/auth.service';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import { apiErrorMessage } from '@/utils/error';

const email = ref('');
const isLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const useAnotherEmail = () => {
  successMsg.value = '';
  errorMsg.value = '';
  email.value = '';
};

const handleSubmit = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    await authService.forgotPassword(email.value.trim());
    successMsg.value = 'Se han enviado las instrucciones a tu correo. Revisa también tu carpeta de spam.';
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'Error procesando la solicitud.');
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
          <h2 class="auth-title">Recuperar Contraseña</h2>
          <p class="auth-description">Ingresa tu correo y te enviaremos un enlace temporal.</p>
        </template>

        <div class="form-body">
          <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
          <UiAlert v-if="successMsg" type="success">{{ successMsg }}</UiAlert>

          <UiInput
            v-if="!successMsg"
            v-model="email"
            label="Correo electrónico"
            type="email"
            placeholder="nombre@empresa.com"
            autocomplete="email"
            required
          />
        </div>

        <template #footer>
          <UiButton v-if="!successMsg" type="submit" :loading="isLoading">
            Enviar Instrucciones
          </UiButton>
          <UiButton v-else type="button" variant="outline" @click="useAnotherEmail">
            Usar otro correo
          </UiButton>

          <div class="auth-footer-links">
            <p><router-link to="/login">Volver al inicio de sesión</router-link></p>
            <p>¿No tienes cuenta? <router-link to="/register">Regístrate</router-link></p>
          </div>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>
