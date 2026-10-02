<template>
  <AuthenticatedLayout>
    <div class="profile-container">
      <UiPageHeader
        title="Mi Cuenta"
        subtitle="Gestiona tu información personal de acceso y credenciales."
      />

      <!-- Profile Hero -->
      <div class="profile-hero">
        <UiAvatar :src="profileAvatar" :name="profileName || profileEmail" size="xl" loading="eager" />
        <div class="profile-identity">
          <h2 class="profile-hero-name">{{ profileName || '---' }}</h2>
          <span class="profile-hero-email">{{ profileEmail }}</span>
          <span v-if="profilePosition" class="profile-hero-position">{{ profilePosition }}</span>
        </div>
      </div>

      <UiAlert v-if="profileLoadError" type="warning">
        {{ profileLoadError }}
        <UiButton size="sm" variant="ghost" width="auto" @click="retryProfileLoad">Reintentar</UiButton>
      </UiAlert>

      <template v-if="isLoadingProfile">
        <UiCard aria-hidden="true">
          <div class="info-grid">
            <div v-for="n in 3" :key="n" class="info-row">
              <UiSkeleton variant="text" width="100px" />
              <UiSkeleton variant="text" width="160px" />
            </div>
          </div>
        </UiCard>
      </template>

      <UiAlert v-if="authStore.user?.pending_email" type="info">
        Tienes un cambio de correo pendiente a <strong>{{ authStore.user?.pending_email }}</strong>.
        Revísalo para verificarlo.
      </UiAlert>
      <div v-if="authStore.user?.pending_email" class="pending-actions">
        <UiButton variant="outline" size="sm" width="auto" :loading="isResending" @click="handleResend">
          Reenviar verificación
        </UiButton>
        <UiButton variant="ghost" size="sm" width="auto" @click="isCancelEmailConfirmOpen = true">
          Cancelar cambio
        </UiButton>
      </div>

      <UiConfirmDialog
        v-model="isCancelEmailConfirmOpen"
        title="Cancelar cambio de correo"
        variant="danger"
        confirm-label="Sí, cancelar"
        @confirm="handleCancelPending"
      >
        ¿Seguro que deseas cancelar el cambio de correo a <strong>{{ authStore.user?.pending_email }}</strong>?
      </UiConfirmDialog>

      <!-- Profile Info Card -->
      <UiCard>
        <template #header>
          <div class="card-header-row">
            <h3 class="card-title">Datos del Perfil</h3>
            <UiButton variant="outline" size="sm" @click="openProfileModal" width="auto">
              <IconEdit :size="14" /> Editar
            </UiButton>
          </div>
        </template>

        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Nombre</span>
            <span class="info-value">{{ profileName || '---' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Correo Electrónico</span>
            <span class="info-value">{{ profileEmail }}</span>
          </div>
        </div>
      </UiCard>

      <!-- Password Card -->
      <UiCard>
        <template #header>
          <div class="card-header-row">
            <h3 class="card-title">Cambiar Contraseña</h3>
            <UiButton variant="outline" size="sm" @click="openPasswordModal" width="auto">
              <IconEdit :size="14" /> Editar
            </UiButton>
          </div>
        </template>

        <p class="card-description">Tu contraseña se mantiene segura. Haz clic en editar para actualizarla.</p>
      </UiCard>

      <!-- Profile Edit Modal -->
      <UiFormModal
        v-model="isProfileModalOpen"
        title="Editar Perfil"
        description="Actualiza tu información personal."
        :confirm-on-dirty="true"
        :dirty="isProfileDirty"
        @submit="handleProfileSubmit"
      >
        <UiAlert v-if="errorMessage" type="error">{{ errorMessage }}</UiAlert>

        <UiInput v-model="form.name" label="Nombre Completo" required />
        <UiInput
          v-model="form.email"
          label="Correo Electrónico"
          type="email"
          autocomplete="email"
          required
        />
        <UiAlert v-if="emailChangeNotice" type="info">
          {{ emailChangeNotice }}
        </UiAlert>
        <UiInput v-model="form.phone" label="Teléfono" type="tel" autocomplete="tel" />
        <UiInput v-model="form.position" label="Cargo" type="text" />
        <div class="form-row">
          <UiInput v-model="form.document_type" label="Tipo Doc." type="text" placeholder="CC" />
          <UiInput v-model="form.document_number" label="Núm. Documento" type="text" />
        </div>
        <UiInput v-model="form.avatar_url" label="URL de Foto" type="text" placeholder="https://..." />
        <div class="form-row">
          <UiInput v-model="form.timezone" label="Zona Horaria" type="text" placeholder="America/Bogota" />
          <UiInput v-model="form.locale" label="Idioma" type="text" placeholder="es" />
        </div>

        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">
              Cancelar
            </UiButton>
            <UiButton type="submit" :loading="isSavingProfile">
              Guardar Cambios
            </UiButton>
          </div>
        </template>
      </UiFormModal>

      <!-- Password Change Modal -->
      <UiFormModal
        v-model="isPasswordModalOpen"
        title="Cambiar Contraseña"
        description="Ingresa tu contraseña actual y la nueva contraseña."
        :confirm-on-dirty="true"
        :dirty="isPasswordDirty"
        @submit="handlePasswordChange"
      >
        <UiAlert v-if="passwordError" type="error">{{ passwordError }}</UiAlert>

        <UiInput
          v-model="passwordForm.currentPassword"
          label="Contraseña Actual"
          type="password"
          required
        />
        <UiInput
          v-model="passwordForm.newPassword"
          label="Nueva Contraseña"
          type="password"
          required
        />

        <UiPasswordStrength v-model="passwordForm.newPassword" />

        <UiInput
          v-model="passwordForm.confirmPassword"
          label="Confirmar Nueva Contraseña"
          type="password"
          :error="passwordMismatchError"
          @blur="passwordConfirmTouched = true"
          required
        />

        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">
              Cancelar
            </UiButton>
            <UiButton type="submit" :loading="isChangingPassword">
              Actualizar Contraseña
            </UiButton>
          </div>
        </template>
      </UiFormModal>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiPasswordStrength from '@/components/ui/UiPasswordStrength.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import { IconEdit } from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';
import { passwordErrorMessage } from '@/utils/password';
import { apiErrorMessage } from '@/utils/error';
import { emptyToUndefined } from '@/utils/text';
import { useDirtyForm } from '@/composables/useDirtyForm';

const authStore = useAuthStore();
const toast = useToast();

// --- PROFILE LOADING ---
const isLoadingProfile = ref(true);
const profileLoadError = ref<string | null>(null);

const loadProfile = async () => {
  isLoadingProfile.value = true;
  profileLoadError.value = null;
  try {
    await authStore.fetchProfile();
  } catch (err: any) {
    profileLoadError.value = apiErrorMessage(err, 'No pudimos cargar tu perfil');
  } finally {
    isLoadingProfile.value = false;
  }
};

const retryProfileLoad = () => loadProfile();

// --- PROFILE ---
const isProfileModalOpen = ref(false);
const isSavingProfile = ref(false);
const errorMessage = ref<string | null>(null);

const form = reactive({
  name: '',
  email: '',
  phone: '',
  avatar_url: '',
  position: '',
  document_type: '',
  document_number: '',
  timezone: '',
  locale: '',
});

const isResending = ref(false);
const isCancelEmailConfirmOpen = ref(false);

const profileName = computed(() => authStore.user?.name || '');
const profileEmail = computed(() => authStore.user?.email || '');
const profileAvatar = computed(() => authStore.user?.avatar_url || '');
const profilePosition = computed(() => authStore.user?.position || '');

// Aviso solo cuando el email del form difiere del actual: cambiarlo dispara
// un flujo de verificación al guardar.
const emailChangeNotice = computed(() => {
  const current = (authStore.user?.email || '').trim().toLowerCase();
  const next = form.email.trim().toLowerCase();
  if (!next || !current || next === current) return null;
  return 'Si guardas este cambio, recibirás un enlace de verificación en la nueva dirección antes de que se active.';
});

onMounted(async () => {
  await loadProfile();
});

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
};

const { isDirty: isProfileDirty, capture: snapshotProfileForm } = useDirtyForm(() => ({ ...form }));

const openProfileModal = () => {
  const user = authStore.user;
  form.name = user?.name || '';
  form.email = user?.email || '';
  form.phone = user?.phone || '';
  form.avatar_url = user?.avatar_url || '';
  form.position = user?.position || '';
  form.document_type = user?.document_type || '';
  form.document_number = user?.document_number || '';
  form.timezone = user?.timezone || '';
  form.locale = user?.locale || '';
  errorMessage.value = null;
  snapshotProfileForm();
  isProfileModalOpen.value = true;
};

const handleProfileSubmit = async () => {
  isSavingProfile.value = true;
  errorMessage.value = null;

  try {
    const result = await userService.updateProfile({
      name: form.name,
      email: form.email,
      phone: emptyToUndefined(form.phone),
      avatar_url: emptyToUndefined(form.avatar_url),
      position: emptyToUndefined(form.position),
      document_type: emptyToUndefined(form.document_type),
      document_number: emptyToUndefined(form.document_number),
      timezone: emptyToUndefined(form.timezone),
      locale: emptyToUndefined(form.locale),
    });
    authStore.updateProfileData({
      name: form.name,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
      position: form.position || null,
      document_type: form.document_type || null,
      document_number: form.document_number || null,
      timezone: form.timezone || null,
      locale: form.locale || null,
      pending_email: result?.data?.pending_email ?? authStore.user?.pending_email ?? null,
    });
    isProfileModalOpen.value = false;
    toast.success(result?.message || 'Perfil actualizado correctamente');
  } catch (error: any) {
    errorMessage.value = apiErrorMessage(error, 'Error al actualizar perfil');
  } finally {
    isSavingProfile.value = false;
  }
};

const handleResend = async () => {
  isResending.value = true;
  try {
    const result = await authService.resendEmailVerification();
    toast.success(`Verificación reenviada a ${result.email}`);
  } catch (error: any) {
    toast.error(apiErrorMessage(error, 'No se pudo reenviar la verificación'));
  } finally {
    isResending.value = false;
  }
};

const handleCancelPending = async () => {
  try {
    await authService.cancelEmailChange();
    authStore.updateProfileData({ pending_email: null });
    toast.success('Cambio de correo cancelado');
  } catch (error: any) {
    toast.error(apiErrorMessage(error, 'No se pudo cancelar el cambio'));
  }
};

// --- PASSWORD ---
const isPasswordModalOpen = ref(false);
const passwordError = ref('');
const isChangingPassword = ref(false);

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordSnapshot = ref('');

const passwordConfirmTouched = ref(false);
const passwordMismatchError = computed(() =>
  passwordConfirmTouched.value && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
    ? 'Las contraseñas no coinciden.'
    : null
);

const snapshotPasswordForm = () => {
  passwordSnapshot.value = JSON.stringify({ ...passwordForm });
};

const isPasswordDirty = computed(
  () => JSON.stringify({ ...passwordForm }) !== passwordSnapshot.value
);

const openPasswordModal = () => {
  passwordForm.currentPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordConfirmTouched.value = false;
  passwordError.value = '';
  snapshotPasswordForm();
  isPasswordModalOpen.value = true;
};

// Password strength
const handlePasswordChange = async () => {
  if (!passwordForm.currentPassword) {
    passwordError.value = 'Ingresa tu contraseña actual.';
    return;
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'Las contraseñas no coinciden.';
    return;
  }

  const passwordRuleError = passwordErrorMessage(passwordForm.newPassword);
  if (passwordRuleError) {
    passwordError.value = passwordRuleError;
    return;
  }

  isChangingPassword.value = true;
  passwordError.value = '';

  try {
    await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    isPasswordModalOpen.value = false;
    toast.success('Contraseña actualizada correctamente');
  } catch (error: any) {
    passwordError.value = apiErrorMessage(error, 'Error al cambiar contraseña');
  } finally {
    isChangingPassword.value = false;
  }
};
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: 600px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.profile-hero-position {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.pending-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.profile-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.profile-hero-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-hero-email {
  font-size: var(--text-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
}
</style>
