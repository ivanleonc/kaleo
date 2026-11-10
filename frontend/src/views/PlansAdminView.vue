<template>
  <AuthenticatedLayout>
    <div class="plans-admin-container">
      <UiPageHeader
        title="Planes y suscripción"
        subtitle="Administra el catálogo de planes y asigna el plan o trial de la empresa activa."
      />

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <UiCard>
        <template #header>
          <div class="section-heading">
            <div>
              <h3 class="section-title">Suscripción actual</h3>
              <p class="section-description">
                {{ company?.name ?? 'Empresa activa' }}
              </p>
            </div>
            <UiBadge v-if="snapshot?.readOnly" variant="warning" size="sm">
              Solo lectura
            </UiBadge>
          </div>
        </template>

        <UiSkeleton v-if="isLoading" variant="text" width="60%" />

        <template v-else>
          <div v-if="subscription" class="subscription-summary">
            <UiInfoRow label="Plan">
              {{ subscription.planName }} ({{ subscription.planCode }})
            </UiInfoRow>
            <UiInfoRow label="Estado">
              <UiBadge :variant="statusVariant(subscription.status)" size="sm">
                {{ statusLabel(subscription.status) }}
              </UiBadge>
            </UiInfoRow>
            <UiInfoRow label="Inicio">{{ formatDate(subscription.currentPeriodStart) }}</UiInfoRow>
            <UiInfoRow label="Fin">
              {{ subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'Sin fin' }}
            </UiInfoRow>
            <UiInfoRow v-if="snapshot?.trialEndsAt" label="Trial termina">
              {{ formatDate(snapshot.trialEndsAt) }}
            </UiInfoRow>
          </div>
          <UiAlert v-else type="info">La empresa no tiene una suscripción activa.</UiAlert>

          <div class="assign-form">
            <UiSelect
              v-model="assignForm.planCode"
              label="Plan"
              :options="planOptions"
              :clearable="false"
            />
            <UiSelect
              v-model="assignForm.status"
              label="Estado"
              :options="statusOptions"
              :clearable="false"
            />
            <UiInput
              v-if="assignForm.status === 'trialing'"
              v-model="assignForm.trialDays"
              label="Días de trial"
              type="number"
            />
            <UiButton
              width="auto"
              :loading="assigning"
              :disabled="!assignForm.planCode"
              @click="assignSubscription"
            >
              Asignar plan
            </UiButton>
          </div>
        </template>
      </UiCard>

      <div class="catalog-heading">
        <h2 class="section-title">Catálogo de planes</h2>
        <UiButton width="auto" variant="outline" @click="openCreatePlan">Nuevo plan</UiButton>
      </div>

      <div v-if="isLoading" class="plans-grid" aria-hidden="true">
        <UiCard v-for="n in 3" :key="n">
          <UiSkeleton variant="title" width="60%" />
          <UiSkeleton variant="text" width="90%" />
          <UiSkeleton variant="text" width="40%" />
        </UiCard>
      </div>

      <UiEmptyState
        v-else-if="plans.length === 0"
        title="Sin planes"
        description="Crea el primer plan para asignarlo a una empresa."
      />

      <div v-else class="plans-grid">
        <UiCard v-for="plan in plans" :key="plan.id" class="plan-card">
          <template #header>
            <div class="plan-card-header">
              <div>
                <h3 class="plan-title">{{ plan.name }}</h3>
                <p class="plan-code">{{ plan.code }}</p>
              </div>
              <UiBadge :variant="plan.isActive ? 'success' : 'neutral'" size="sm">
                {{ plan.isActive ? 'Activo' : 'Inactivo' }}
              </UiBadge>
            </div>
          </template>

          <div class="plan-meta">
            <span>Trial: {{ plan.trialDays }} días</span>
            <span>{{ plan.billingInterval === 'year' ? 'Anual' : 'Mensual' }}</span>
            <span>{{ plan.price }} {{ plan.currencyCode }}</span>
          </div>

          <div class="plan-block">
            <h4 class="plan-block-title">Módulos ({{ plan.modules.length }})</h4>
            <div class="chip-list">
              <UiBadge
                v-for="code in plan.modules"
                :key="code"
                variant="info"
                size="sm"
              >
                {{ code }}
              </UiBadge>
            </div>
          </div>

          <div class="plan-block">
            <h4 class="plan-block-title">Límites ({{ plan.limits.length }})</h4>
            <ul v-if="plan.limits.length > 0" class="limit-list">
              <li v-for="limit in plan.limits" :key="`${limit.moduleCode}.${limit.featureCode}`">
                <code>{{ limit.moduleCode }}.{{ limit.featureCode }}</code>
                <span>{{ limit.limitValue ?? '∞' }} / {{ limit.period }}</span>
                <UiBadge :variant="limit.isHard ? 'neutral' : 'info'" size="sm">
                  {{ limit.isHard ? 'duro' : 'blando' }}
                </UiBadge>
                <UiBadge v-if="limit.limitKind === 'gauge'" variant="warning" size="sm">
                  gauge
                </UiBadge>
              </li>
            </ul>
            <p v-else class="muted">Sin límites.</p>
          </div>

          <div class="plan-actions">
            <UiButton variant="ghost" size="sm" width="auto" @click="openEditPlan(plan)">
              Editar
            </UiButton>
            <UiButton variant="outline" size="sm" width="auto" @click="openModules(plan)">
              Módulos
            </UiButton>
            <UiButton variant="outline" size="sm" width="auto" @click="openLimits(plan)">
              Límites
            </UiButton>
          </div>
        </UiCard>
      </div>

      <UiFormModal
        v-model="isPlanModalOpen"
        :title="editingPlan ? 'Editar plan' : 'Nuevo plan'"
        :description="editingPlan ? editingPlan.code : 'Define el código, trial y precio del plan.'"
        :submit-label="editingPlan ? 'Guardar cambios' : 'Crear plan'"
        :loading="saving"
        @submit="submitPlan"
      >
        <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
        <UiInput
          v-model="planForm.code"
          label="Código"
          placeholder="construction"
          :disabled="!!editingPlan"
          required
        />
        <UiInput v-model="planForm.name" label="Nombre" required />
        <UiInput v-model="planForm.trialDays" label="Días de trial" type="number" />
        <UiSelect
          v-model="planForm.billingInterval"
          label="Intervalo"
          :options="intervalOptions"
          :clearable="false"
        />
        <UiInput v-model="planForm.price" label="Precio" type="number" />
        <UiInput v-model="planForm.currencyCode" label="Moneda" placeholder="COP" />
        <UiSwitch v-model="planForm.isActive" label="Plan activo" />
      </UiFormModal>

      <UiFormModal
        v-model="isModulesModalOpen"
        title="Módulos del plan"
        :description="modulesPlan ? `${modulesPlan.name} · ${modulesPlan.code}` : ''"
        submit-label="Guardar módulos"
        :loading="saving"
        @submit="submitModules"
      >
        <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
        <div class="module-checklist">
          <label v-for="module in catalog" :key="module.code" class="module-option">
            <input
              type="checkbox"
              :checked="module.isCore || selectedModules.includes(module.code)"
              :disabled="module.isCore"
              @change="toggleModule(module.code, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              <strong>{{ module.name }}</strong>
              <small>{{ module.code }}{{ module.isCore ? ' · siempre incluido' : '' }}</small>
            </span>
          </label>
        </div>
      </UiFormModal>

      <UiFormModal
        v-model="isLimitsModalOpen"
        title="Límites del plan"
        :description="limitsPlan ? `${limitsPlan.name} · ${limitsPlan.code}` : ''"
        submit-label="Guardar límites"
        :loading="saving"
        @submit="submitLimits"
      >
        <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
        <div class="limit-rows">
          <div v-for="(row, index) in limitRows" :key="index" class="limit-row">
            <UiSelect
              v-model="row.moduleCode"
              label="Módulo"
              :options="limitModuleOptions"
              :clearable="false"
            />
            <UiInput v-model="row.featureCode" label="Feature" placeholder="max_active" />
            <UiInput v-model="row.limitValue" label="Valor (vacío = ∞)" type="number" />
            <UiSelect
              v-model="row.period"
              label="Período"
              :options="periodOptions"
              :clearable="false"
            />
            <UiSelect
              v-model="row.limitKind"
              label="Tipo"
              :options="limitKindOptions"
              :clearable="false"
            />
            <UiSwitch v-model="row.isHard" label="Duro" />
            <UiButton
              variant="danger"
              size="sm"
              width="auto"
              type="button"
              @click="removeLimitRow(index)"
            >
              Quitar
            </UiButton>
          </div>
        </div>
        <UiButton variant="outline" width="auto" type="button" @click="addLimitRow">
          Añadir límite
        </UiButton>
      </UiFormModal>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type {
  CompanySubscriptionRecord,
  ModuleManifest,
  PlanRecord,
} from '@saas/shared';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import UiInfoRow from '@/components/ui/UiInfoRow.vue';
import { planAdminService } from '@/services/plan-admin.service';
import { moduleService } from '@/services/module.service';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';

interface LimitRow {
  moduleCode: string;
  featureCode: string;
  limitValue: string;
  period: string;
  limitKind: string;
  isHard: boolean;
}

const toast = useToast();
const { companyId, company } = useCompanyPath();
const entitlementsStore = useEntitlementsStore();

const plans = ref<PlanRecord[]>([]);
const catalog = ref<ModuleManifest[]>([]);
const subscription = ref<CompanySubscriptionRecord | null>(null);
const isLoading = ref(true);
const saving = ref(false);
const assigning = ref(false);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);

const snapshot = computed(() => entitlementsStore.snapshot);

const statusOptions = [
  { label: 'Activo', value: 'active' },
  { label: 'Trial', value: 'trialing' },
  { label: 'Pago pendiente', value: 'past_due' },
  { label: 'Cancelado', value: 'canceled' },
  { label: 'Vencido', value: 'expired' },
];
const intervalOptions = [
  { label: 'Mensual', value: 'month' },
  { label: 'Anual', value: 'year' },
];
const periodOptions = [
  { label: 'Sin período', value: 'none' },
  { label: 'Mensual', value: 'month' },
  { label: 'Anual', value: 'year' },
];
const limitKindOptions = [
  { label: 'Consumo', value: 'usage' },
  { label: 'Valor actual', value: 'gauge' },
];

const planOptions = computed(() =>
  plans.value.map((plan) => ({ label: `${plan.name} (${plan.code})`, value: plan.code })),
);

const assignForm = reactive<{
  planCode: string;
  status: string;
  trialDays: string;
}>({ planCode: '', status: 'active', trialDays: '14' });

// Plan general
const editingPlan = ref<PlanRecord | null>(null);
const isPlanModalOpen = ref(false);
const planForm = reactive({
  code: '',
  name: '',
  trialDays: '0',
  billingInterval: 'month',
  price: '0',
  currencyCode: 'COP',
  isActive: true,
});

// Módulos
const modulesPlan = ref<PlanRecord | null>(null);
const selectedModules = ref<string[]>([]);
const isModulesModalOpen = computed({
  get: () => modulesPlan.value !== null,
  set: (value: boolean) => {
    if (!value) modulesPlan.value = null;
  },
});

// Límites
const limitsPlan = ref<PlanRecord | null>(null);
const limitRows = ref<LimitRow[]>([]);
const isLimitsModalOpen = computed({
  get: () => limitsPlan.value !== null,
  set: (value: boolean) => {
    if (!value) limitsPlan.value = null;
  },
});
const limitModuleOptions = computed(() =>
  (limitsPlan.value?.modules ?? []).map((code) => ({ label: code, value: code })),
);

async function load() {
  if (!companyId.value) return;
  isLoading.value = true;
  error.value = null;
  try {
    const [plansResponse, catalogResponse, subscriptionResponse] = await Promise.all([
      planAdminService.list(),
      moduleService.getCatalog(),
      planAdminService.getSubscription(companyId.value),
    ]);
    plans.value = plansResponse.data;
    catalog.value = catalogResponse.data;
    subscription.value = subscriptionResponse.data;

    const currentPlan = plans.value.find((plan) => plan.code === assignForm.planCode);
    if (!assignForm.planCode) {
      assignForm.planCode = subscription.value?.planCode ?? plans.value[0]?.code ?? '';
    }
    if (subscription.value) {
      assignForm.status = subscription.value.status;
    }
    if (!currentPlan) {
      const selected = plans.value.find((plan) => plan.code === assignForm.planCode);
      if (selected) assignForm.trialDays = String(selected.trialDays || 14);
    }

    await entitlementsStore.load(companyId.value, true);
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudieron cargar los planes');
  } finally {
    isLoading.value = false;
  }
}

async function assignSubscription() {
  if (!companyId.value) return;
  assigning.value = true;
  error.value = null;
  try {
    await planAdminService.assignSubscription(companyId.value, {
      planCode: assignForm.planCode,
      status: assignForm.status as any,
      trialDays:
        assignForm.status === 'trialing' ? Number(assignForm.trialDays) || undefined : undefined,
    });
    toast.success('Suscripción actualizada');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo asignar la suscripción');
  } finally {
    assigning.value = false;
  }
}

function openCreatePlan() {
  editingPlan.value = null;
  formError.value = null;
  Object.assign(planForm, {
    code: '',
    name: '',
    trialDays: '0',
    billingInterval: 'month',
    price: '0',
    currencyCode: 'COP',
    isActive: true,
  });
  isPlanModalOpen.value = true;
}

function openEditPlan(plan: PlanRecord) {
  editingPlan.value = plan;
  formError.value = null;
  Object.assign(planForm, {
    code: plan.code,
    name: plan.name,
    trialDays: String(plan.trialDays),
    billingInterval: plan.billingInterval,
    price: String(plan.price),
    currencyCode: plan.currencyCode,
    isActive: plan.isActive,
  });
  isPlanModalOpen.value = true;
}

async function submitPlan() {
  saving.value = true;
  formError.value = null;
  try {
    const payload = {
      name: planForm.name.trim(),
      trialDays: Number(planForm.trialDays) || 0,
      billingInterval: planForm.billingInterval as 'month' | 'year',
      price: Number(planForm.price) || 0,
      currencyCode: planForm.currencyCode.trim().toUpperCase(),
      isActive: planForm.isActive,
    };
    if (editingPlan.value) {
      await planAdminService.update(editingPlan.value.id, payload);
      toast.success('Plan actualizado');
    } else {
      await planAdminService.create({ ...payload, code: planForm.code.trim() });
      toast.success('Plan creado');
    }
    isPlanModalOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No se pudo guardar el plan');
  } finally {
    saving.value = false;
  }
}

function openModules(plan: PlanRecord) {
  formError.value = null;
  modulesPlan.value = plan;
  selectedModules.value = plan.modules.filter((code) => !code.startsWith('core.'));
}

function toggleModule(code: string, checked: boolean) {
  if (checked) {
    if (!selectedModules.value.includes(code)) selectedModules.value.push(code);
  } else {
    selectedModules.value = selectedModules.value.filter((item) => item !== code);
  }
}

async function submitModules() {
  if (!modulesPlan.value) return;
  saving.value = true;
  formError.value = null;
  try {
    await planAdminService.setModules(modulesPlan.value.id, selectedModules.value);
    toast.success('Módulos del plan actualizados');
    modulesPlan.value = null;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No se pudieron guardar los módulos');
  } finally {
    saving.value = false;
  }
}

function openLimits(plan: PlanRecord) {
  formError.value = null;
  limitsPlan.value = plan;
  limitRows.value = plan.limits.map((limit) => ({
    moduleCode: limit.moduleCode,
    featureCode: limit.featureCode,
    limitValue: limit.limitValue === null ? '' : String(limit.limitValue),
    period: limit.period,
    limitKind: limit.limitKind ?? 'usage',
    isHard: limit.isHard,
  }));
}

function addLimitRow() {
  const moduleCode = limitsPlan.value?.modules[0] ?? '';
  limitRows.value.push({
    moduleCode,
    featureCode: '',
    limitValue: '',
    period: 'none',
    limitKind: 'usage',
    isHard: true,
  });
}

function removeLimitRow(index: number) {
  limitRows.value.splice(index, 1);
}

async function submitLimits() {
  if (!limitsPlan.value) return;
  saving.value = true;
  formError.value = null;
  try {
    await planAdminService.setLimits(
      limitsPlan.value.id,
      limitRows.value.map((row) => ({
        moduleCode: row.moduleCode,
        featureCode: row.featureCode.trim(),
        limitValue: row.limitValue === '' ? null : Number(row.limitValue),
        period: row.period as 'none' | 'month' | 'year',
        isHard: row.isHard,
        limitKind: row.limitKind as 'usage' | 'gauge',
      })),
    );
    toast.success('Límites del plan actualizados');
    limitsPlan.value = null;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No se pudieron guardar los límites');
  } finally {
    saving.value = false;
  }
}

function statusVariant(status: CompanySubscriptionRecord['status']) {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
    case 'past_due':
      return 'warning';
    case 'canceled':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

onMounted(load);
</script>

<style scoped>
.plans-admin-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.section-heading,
.plan-card-header,
.catalog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.catalog-heading {
  align-items: center;
  margin-top: var(--space-2);
}

.section-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.section-description,
.plan-code,
.muted {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.subscription-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.assign-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  align-items: end;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.plan-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.plan-block {
  margin-top: var(--space-4);
}

.plan-block-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.limit-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-sm);
}

.limit-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

.limit-list code {
  color: var(--text-main);
}

.plan-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.module-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 420px;
  overflow-y: auto;
}

.module-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-main);
}

.module-option small {
  display: block;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.limit-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.limit-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-2);
  align-items: end;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
