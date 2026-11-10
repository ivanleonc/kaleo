<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { invitationService } from '@/services/invitation.service';
import { useAuthStore } from '@/stores/auth.store';
import { passwordErrorMessage } from '@/utils/password';
import { apiErrorMessage } from '@/utils/error';
import type { InvitationPreview } from '@/types/invitation';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiPasswordStrength from '@/components/ui/UiPasswordStrength.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => (route.query.token as string) || '');
const preview = ref<InvitationPreview | null>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const name = ref('');
const password = ref('');
const passwordConfirm = ref('');

const needsLogin = computed(
  () => preview.value?.requiresLogin === true && !authStore.isAuthenticated,
);
const loginRedirect = computed(
  () => `/login?redirect=${encodeURIComponent(route.fullPath)}`,
);

const acceptAuthenticated = async () => {
  isSubmitting.value = true;
  try {
    const response = await invitationService.acceptAuthenticated(token.value);
    successMsg.value = `Te uniste a ${response.data.companyName}.`;
  } catch (error) {
    errorMsg.value = apiErrorMessage(error, 'No se pudo aceptar la invitación con tu cuenta.');
  } finally {
    isSubmitting.value = false;
  }
};

const load = async () => {
  if (!token.value) {
    errorMsg.value = 'El enlace de invitación está incompleto.';
    isLoading.value = false;
    return;
  }

  try {
    const response = await invitationService.preview(token.value);
    preview.value = response.data;
    name.value = response.data.name || '';
    if (response.data.requiresLogin && authStore.isAuthenticated) {
      await acceptAuthenticated();
    }
  } catch (error) {
    errorMsg.value = apiErrorMessage(error, 'La invitación no es válida o expiró.');
  } finally {
    isLoading.value = false;
  }
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

  isSubmitting.value = true;
  errorMsg.value = '';
  try {
    const response = await invitationService.accept({
      token: token.value,
      name: name.value.trim(),
      password: password.value,
    });
    successMsg.value = `Invitación aceptada. Ya puedes iniciar sesión en ${response.data.companyName}.`;
  } catch (error) {
    errorMsg.value = apiErrorMessage(error, 'No se pudo aceptar la invitación.');
  } finally {
    isSubmitting.value = false;
  }
};

const goToLogin = () => router.push(loginRedirect.value);
const goToDashboard = () => router.push('/');

const switchAccount = async () => {
  await authStore.logout();
  await router.push(loginRedirect.value);
};

onMounted(load);
</script>

<template>
  <AuthLayout>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <UiCard>
        <template #header>
          <h1 class="auth-title">Aceptar invitación</h1>
          <p v-if="preview" class="auth-description">
            Te invitaron a unirte a <strong>{{ preview.companyName }}</strong>.
          </p>
        </template>

        <div class="form-body">
          <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
          <UiAlert v-if="successMsg" type="success">{{ successMsg }}</UiAlert>

          <p v-if="isLoading" class="auth-description">Cargando invitación…</p>

          <template v-else-if="preview && !successMsg">
            <p v-if="preview.requiresLogin" class="auth-description">
              Esta invitación es para <strong>{{ preview.email }}</strong>.
              <template v-if="!authStore.isAuthenticated">
                Inicia sesión con esa cuenta para aceptarla.
              </template>
            </p>

            <template v-if="!preview.requiresLogin">
              <UiInput v-model="name" label="Nombre completo" required />
              <UiInput
                v-model="password"
                label="Contraseña"
                type="password"
                autocomplete="new-password"
                required
              />
              <UiPasswordStrength v-model="password" />
              <UiInput
                v-model="passwordConfirm"
                label="Confirmar contraseña"
                type="password"
                autocomplete="new-password"
                required
              />
            </template>
          </template>
        </div>

        <template #footer>
          <UiButton v-if="successMsg" type="button" @click="goToDashboard">
            Ir a Kaleo
          </UiButton>
          <UiButton
            v-else-if="preview && !preview.requiresLogin"
            type="submit"
            :loading="isSubmitting"
          >
            Aceptar invitación
          </UiButton>
          <UiButton v-else-if="needsLogin" type="button" @click="goToLogin">
            Iniciar sesión para aceptar
          </UiButton>
          <UiButton
            v-else-if="preview?.requiresLogin && authStore.isAuthenticated && !isSubmitting"
            type="button"
            @click="switchAccount"
          >
            Usar otra cuenta
          </UiButton>

          <div class="auth-footer-links">
            <p><router-link to="/login">Volver al inicio de sesión</router-link></p>
          </div>
        </template>
      </UiCard>
    </form>
  </AuthLayout>
</template>
