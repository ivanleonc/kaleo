<template>
  <AuthLayout max-width="760px">
    <div class="onboarding-shell">
      <UiCard>
        <template #header>
          <div class="onboarding-header">
            <p class="onboarding-eyebrow">Configuración inicial</p>
            <h1 class="onboarding-title">{{ stepTitle }}</h1>
            <p class="onboarding-description">{{ stepDescription }}</p>
          </div>
        </template>

        <UiSteps :steps="STEPS" :current="currentStep" label="Pasos de configuración" />

        <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
        <UiAlert v-if="success" type="success">{{ success }}</UiAlert>

        <!-- Paso 1: empresa -->
        <section v-if="currentStep === 1" class="onboarding-section">
          <template v-if="companyId">
            <p class="onboarding-copy">
              Tu organización <strong>{{ companyName }}</strong> ya está creada. Continuemos con
              los módulos que usarás.
            </p>
            <UiButton width="auto" @click="goToModules">Continuar</UiButton>
          </template>

          <form v-else class="onboarding-form" @submit.prevent="handleCreateCompany" novalidate>
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
              label="Tax ID / NIT / RFC (opcional)"
              type="text"
              placeholder="Ej. TAX-12345"
              :error="taxIdError"
            />
            <p class="onboarding-hint">
              Este nombre es visible para los miembros que invites. Puedes cambiarlo después en
              Configuración.
            </p>
            <UiButton type="submit" :loading="companyStore.isLoading" width="auto">
              Crear organización
            </UiButton>
          </form>
        </section>

        <!-- Paso 2: módulos -->
        <section v-else-if="currentStep === 2" class="onboarding-section">
          <p class="onboarding-copy">
            Estos módulos están incluidos en tu plan. Puedes desactivar los que no uses ahora y
            activarlos más adelante.
          </p>

          <div v-if="isLoadingModules" class="module-grid" aria-hidden="true">
            <UiSkeleton v-for="n in 2" :key="n" variant="text" width="100%" />
          </div>

          <div v-else class="module-grid">
            <article
              v-for="module in nonCoreModules"
              :key="module.code"
              class="module-card"
            >
              <div class="module-card-head">
                <div>
                  <h3>{{ module.name }}</h3>
                  <p>{{ module.routes.map((route) => route.title).join(' · ') || 'Módulo compartido' }}</p>
                </div>
                <UiBadge
                  :label="moduleStatusLabel(module.status)"
                  :variant="moduleStatusVariant(module.status)"
                  size="sm"
                />
              </div>
              <UiButton
                size="sm"
                :variant="module.status === 'disabled' ? 'primary' : 'outline'"
                width="auto"
                :disabled="module.status === 'read_only' || isSavingModule === module.code"
                :loading="isSavingModule === module.code"
                @click="toggleModule(module)"
              >
                {{
                  module.status === 'disabled'
                    ? 'Activar'
                    : module.status === 'read_only'
                      ? 'Solo lectura'
                      : 'Desactivar'
                }}
              </UiButton>
            </article>

            <p v-if="nonCoreModules.length === 0" class="onboarding-hint">
              Tu plan actual solo incluye módulos base. Puedes continuar.
            </p>
          </div>

          <div v-if="coreModules.length > 0" class="core-modules">
            <span class="core-modules-label">Siempre activos:</span>
            <UiBadge v-for="module in coreModules" :key="module.code" :label="module.name" size="sm" />
          </div>

          <div class="onboarding-actions">
            <UiButton variant="ghost" width="auto" @click="skipModules">Omitir por ahora</UiButton>
            <UiButton width="auto" :loading="isSavingStep" @click="finishModules">
              Continuar con el equipo
            </UiButton>
          </div>
        </section>

        <!-- Paso 3: equipo -->
        <section v-else-if="currentStep === 3" class="onboarding-section">
          <p class="onboarding-copy">
            Invita a las personas que trabajarán contigo. Puedes enviar varias invitaciones o
            hacerlo más tarde desde Equipo.
          </p>

          <UiAlert v-if="inviteError" type="error">{{ inviteError }}</UiAlert>
          <UiAlert v-if="inviteSuccess" type="success">{{ inviteSuccess }}</UiAlert>

          <form class="onboarding-form" @submit.prevent="sendInvitation" novalidate>
            <div class="form-grid">
              <UiInput v-model="inviteForm.email" label="Correo electrónico" type="email" autocomplete="email" required />
              <UiInput v-model="inviteForm.name" label="Nombre (opcional)" type="text" />
              <UiSelect
                v-model="inviteForm.roleId"
                label="Rol"
                :options="roleOptions"
                :clearable="false"
                class="span-2"
              />
            </div>
            <UiButton
              type="submit"
              variant="outline"
              width="auto"
              :loading="isInviting"
              :disabled="!inviteForm.email || !inviteForm.roleId"
            >
              Enviar invitación
            </UiButton>
          </form>

          <div v-if="invitedEmails.length > 0" class="invited-list">
            <p class="core-modules-label">Invitaciones enviadas:</p>
            <UiBadge v-for="email in invitedEmails" :key="email" :label="email" variant="success" size="sm" />
          </div>

          <div class="onboarding-actions">
            <UiButton variant="ghost" width="auto" @click="finishTeam">Omitir por ahora</UiButton>
            <UiButton width="auto" :loading="isSavingStep" @click="finishTeam">
              Continuar
            </UiButton>
          </div>
        </section>

        <!-- Paso 4: resumen -->
        <section v-else class="onboarding-section">
          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-label">Organización</span>
              <strong>{{ companyName || form.name }}</strong>
            </div>
            <div class="summary-card">
              <span class="summary-label">Módulos activos</span>
              <strong>{{ activeModuleCount }}</strong>
            </div>
            <div class="summary-card">
              <span class="summary-label">Invitaciones enviadas</span>
              <strong>{{ invitedEmails.length }}</strong>
            </div>
          </div>

          <div v-if="nextSteps.length > 0" class="next-steps">
            <h3>Primeros pasos recomendados</h3>
            <ul>
              <li v-for="step in nextSteps" :key="step.code">
                <strong>{{ step.title }}</strong>
                <span v-if="step.description">{{ step.description }}</span>
              </li>
            </ul>
          </div>

          <div class="onboarding-actions">
            <UiButton width="auto" :loading="isFinishing" @click="finishOnboarding">
              Ir al panel
            </UiButton>
          </div>
        </section>
      </UiCard>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useModulesStore } from '@/stores/modules.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { emptyToUndefined } from '@/utils/text';
import { apiErrorMessage } from '@/utils/error';
import { invitationService } from '@/services/invitation.service';
import { moduleService } from '@/services/module.service';
import { onboardingService } from '@/services/onboarding.service';
import { roleService, type Role } from '@/services/role.service';
import type { OnboardingState } from '@/types/onboarding';
import type { EnabledModule, ModuleStatus } from '@saas/shared';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSteps from '@/components/ui/UiSteps.vue';

const STEPS = [
  { number: 1, label: 'Empresa' },
  { number: 2, label: 'Módulos' },
  { number: 3, label: 'Equipo' },
  { number: 4, label: 'Listo' },
] as const;

const STEP_TITLES: Record<number, string> = {
  1: 'Crea tu primera organización',
  2: 'Elige tus módulos',
  3: 'Invita a tu equipo',
  4: 'Todo listo',
};

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Necesitas un espacio de trabajo para empezar. Podrás crear más después.',
  2: 'Tu plan define qué módulos están disponibles. Activa solo los que necesites.',
  3: 'Trabaja en equipo desde el primer día. Las invitaciones llegan por correo.',
  4: 'Revisa el resumen y empieza a usar Kaleo.',
};

const router = useRouter();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
const modulesStore = useModulesStore();
const { companyId, companyDashboardPath } = useCompanyPath();

const MAX_NAME_LENGTH = 100;
const MAX_TAX_ID_LENGTH = 50;

const currentStep = ref(1);
const stepTitle = computed(() => STEP_TITLES[currentStep.value] ?? '');
const stepDescription = computed(() => STEP_DESCRIPTIONS[currentStep.value] ?? '');

const form = reactive({ name: '', tax_id: '' });
const submitted = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const companyName = computed(
  () =>
    authStore.user?.tenants?.find((tenant) => tenant.id === companyId.value)?.name ??
    form.name,
);

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

// --- Módulos ---
const availableModules = ref<EnabledModule[]>([]);
const isLoadingModules = ref(false);
const isSavingModule = ref<string | null>(null);
const nonCoreModules = computed(() => availableModules.value.filter((module) => !module.isCore));
const coreModules = computed(() => availableModules.value.filter((module) => module.isCore));
const activeModuleCount = computed(
  () => availableModules.value.filter((module) => module.status !== 'disabled').length,
);

function moduleStatusLabel(status: ModuleStatus): string {
  return {
    enabled: 'Activo',
    trial: 'En prueba',
    read_only: 'Solo lectura',
    disabled: 'Desactivado',
  }[status];
}

function moduleStatusVariant(status: ModuleStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'enabled') return 'success';
  if (status === 'disabled') return 'neutral';
  return 'warning';
}

async function loadModules(): Promise<void> {
  isLoadingModules.value = true;
  try {
    availableModules.value = (await moduleService.getAvailable()).data;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar los módulos');
  } finally {
    isLoadingModules.value = false;
  }
}

async function toggleModule(module: EnabledModule): Promise<void> {
  if (module.status === 'read_only') return;
  const enable = module.status === 'disabled';
  isSavingModule.value = module.code;
  error.value = null;
  try {
    await moduleService.setSelection(module.code, enable);
    await loadModules();
    await saveSelectedModules();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos actualizar el módulo');
  } finally {
    isSavingModule.value = null;
  }
}

async function saveSelectedModules(): Promise<void> {
  await onboardingService.updateState({
    selectedModules: availableModules.value
      .filter((module) => !module.isCore && module.status !== 'disabled')
      .map((module) => module.code),
  });
}

async function goToModules(): Promise<void> {
  error.value = null;
  if (companyId.value) {
    try {
      await onboardingService.updateState({ completedSteps: ['company'] });
    } catch (err) {
      error.value = apiErrorMessage(err, 'No pudimos guardar el progreso');
      return;
    }
  }
  currentStep.value = 2;
  await loadModules();
}

async function finishModules(): Promise<void> {
  if (!(await completeStep('modules'))) return;
  currentStep.value = 3;
  await loadRoles();
}

async function skipModules(): Promise<void> {
  if (!(await completeStep('modules'))) return;
  currentStep.value = 3;
  await loadRoles();
}

// --- Equipo ---
const roles = ref<Role[]>([]);
const inviteForm = reactive({ email: '', name: '', roleId: '' });
const isInviting = ref(false);
const inviteError = ref<string | null>(null);
const inviteSuccess = ref<string | null>(null);
const invitedEmails = ref<string[]>([]);

const roleOptions = computed(() =>
  roles.value.map((role) => ({ label: role.name, value: role.id })),
);

async function loadRoles(): Promise<void> {
  if (roles.value.length > 0) return;
  try {
    roles.value = await roleService.getRoles();
    const viewer = roles.value.find((role) => role.name === 'Viewer');
    inviteForm.roleId = viewer?.id ?? roles.value[0]?.id ?? '';
  } catch (err) {
    inviteError.value = apiErrorMessage(err, 'No pudimos cargar los roles');
  }
}

async function sendInvitation(): Promise<void> {
  if (!companyId.value) return;
  if (!inviteForm.email.trim() || !inviteForm.roleId) {
    inviteError.value = 'Ingresa un correo y selecciona un rol.';
    return;
  }

  isInviting.value = true;
  inviteError.value = null;
  inviteSuccess.value = null;
  try {
    const response = await invitationService.create(companyId.value, {
      email: inviteForm.email.trim(),
      name: inviteForm.name.trim() || undefined,
      roleIds: [inviteForm.roleId],
    });
    invitedEmails.value.push(inviteForm.email.trim());
    inviteSuccess.value = response.message || 'Invitación enviada';
    inviteForm.email = '';
    inviteForm.name = '';
  } catch (err) {
    inviteError.value = apiErrorMessage(err, 'No pudimos enviar la invitación');
  } finally {
    isInviting.value = false;
  }
}

async function finishTeam(): Promise<void> {
  if (!(await completeStep('team'))) return;
  currentStep.value = 4;
}

// --- Resumen ---
const nextSteps = computed(() =>
  availableModules.value
    .filter((module) => module.status !== 'disabled')
    .flatMap((module) => module.onboarding ?? [])
    .filter((step) => Boolean(step.title))
    .slice(0, 5),
);

const isSavingStep = ref(false);
const isFinishing = ref(false);

async function completeStep(step: string): Promise<boolean> {
  isSavingStep.value = true;
  error.value = null;
  try {
    await onboardingService.updateState({ completedSteps: [step] });
    return true;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos guardar el progreso');
    return false;
  } finally {
    isSavingStep.value = false;
  }
}

async function finishOnboarding(): Promise<void> {
  isFinishing.value = true;
  error.value = null;
  try {
    await onboardingService.updateState({ completedSteps: ['summary'], completed: true });
    if (companyId.value) {
      // El store pudo haberse cargado antes de activar/desactivar módulos.
      await modulesStore.load(companyId.value, true);
    }
    router.push(companyDashboardPath());
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos finalizar la configuración');
  } finally {
    isFinishing.value = false;
  }
}

// --- Inicio ---
async function handleCreateCompany(): Promise<void> {
  submitted.value = true;
  error.value = null;
  success.value = null;
  if (hasErrors.value) return;

  try {
    await companyStore.createCompany({
      name: form.name.trim(),
      tax_id: emptyToUndefined(form.tax_id),
    });
    await authStore.refreshTokens();
    await authStore.fetchProfile();
    await onboardingService.updateState({ completedSteps: ['company'] });
    success.value = 'Organización creada. Elige los módulos que quieres usar.';
    currentStep.value = 2;
    await loadModules();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos crear la organización');
  }
}

function inferStep(state: OnboardingState): number {
  if (state.completedSteps.includes('team')) return 4;
  if (state.completedSteps.includes('modules')) return 3;
  return 2;
}

onMounted(async () => {
  if (!companyId.value) return;

  try {
    const state = (await onboardingService.getState()).data;
    if (state.completed || !state.startedAt) {
      router.replace(companyDashboardPath());
      return;
    }

    currentStep.value = inferStep(state);
    await loadModules();
    if (currentStep.value >= 3) await loadRoles();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar la configuración inicial');
  }
});
</script>

<style scoped>
.onboarding-shell {
  width: min(720px, 100%);
}

.onboarding-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.onboarding-eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.onboarding-title {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--text-main);
}

.onboarding-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.onboarding-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.onboarding-copy {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.onboarding-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.onboarding-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.onboarding-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-3);
}

.module-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-app);
}

.module-card-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  align-items: flex-start;
}

.module-card h3 {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
}

.module-card p {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.core-modules,
.invited-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.core-modules-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-app);
}

.summary-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.next-steps h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
}

.next-steps ul {
  margin: 0;
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.next-steps li {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.next-steps li strong {
  display: block;
  color: var(--text-main);
}

@media (max-width: 560px) {
  .onboarding-actions {
    flex-direction: column-reverse;
  }
}
</style>
