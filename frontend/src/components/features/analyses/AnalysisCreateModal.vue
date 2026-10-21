<template>
  <UiFormModal
    v-model="isOpen"
    title="Nuevo análisis"
    description="Carga la facturación en Excel y guarda el resultado en el historial de la empresa."
    size="large"
    :confirm-on-dirty="true"
    :dirty="isDirty"
    :prevent-close="isBusy"
    :loading="isBusy"
    @submit="handleSubmit"
  >
    <div v-if="isSuccess" class="success-block" role="status" aria-live="polite">
      <div class="success-heading">
        <div class="success-icon">
          <IconCircleCheck :size="34" stroke-width="1.7" />
        </div>
        <div>
          <h3 class="success-title">Análisis guardado</h3>
          <p class="success-text">
            <strong>{{ savedAnalysis?.name }}</strong> ya está disponible en el historial de la empresa.
          </p>
        </div>
      </div>
      <UiStatList
        v-if="lastResult"
        class="success-kpis"
        :items="successStats"
        layout="grid"
        :columns="3"
        label="Resumen del análisis"
      />
    </div>

    <template v-else>
      <UiSteps
        :steps="STEPS"
        :current="currentStep"
        :complete="isSuccess"
        :error-at="phase === 'save-error' ? 3 : null"
        label="Pasos para guardar el análisis"
      />

      <UiAlert v-if="displayError" type="error">{{ displayError }}</UiAlert>
      <p v-if="displayError" class="error-hint">
        <template v-if="phase === 'save-error'">
          El archivo se procesó correctamente. Puedes reintentar el guardado sin volver a cargarlo.
        </template>
        <template v-else>
          Verifica que el Excel conserve sus columnas, no esté protegido y pese menos de 10 MB.
        </template>
      </p>

      <UiInput
        v-model="name"
        label="Nombre del análisis"
        placeholder="Ej. Facturación enero 2026"
        required
        :disabled="isBusy"
      />

      <UiFileDropzone
        :model-value="selectedFile"
        label="Archivo de facturación"
        :accept="ENERGY_FILE_ACCEPT"
        :max-size="ENERGY_MAX_FILE_SIZE"
        hint="Formatos .xlsx y .xls · Máximo 10 MB"
        :disabled="isBusy"
        @update:model-value="handleFileUpdate"
      >
        <template #title>
          Arrastra el Excel aquí o <span class="dropzone-link">selecciónalo</span>
        </template>
      </UiFileDropzone>

      <div v-if="isBusy" class="progress-block" role="status" aria-live="polite">
        <div class="progress-header">
          <span>{{ progressLabel }}</span>
          <span class="progress-value">{{ progress }}%</span>
        </div>
        <div
          class="progress-track"
          role="progressbar"
          aria-label="Progreso del análisis"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </template>

    <template #footer="{ requestClose }">
      <div v-if="isSuccess" class="modal-footer">
        <UiButton variant="outline" width="auto" @click="startAnother">Crear otro</UiButton>
        <UiButton width="auto" @click="viewSaved">Ver análisis</UiButton>
      </div>
      <div v-else-if="phase === 'save-error'" class="modal-footer">
        <UiButton variant="outline" width="auto" :disabled="isBusy" @click="requestClose">
          Cancelar
        </UiButton>
        <UiButton width="auto" :loading="analysisStore.isLoading" @click="retrySave">
          Reintentar guardado
        </UiButton>
      </div>
      <div v-else class="modal-footer">
        <UiButton
          v-if="phase === 'processing'"
          variant="outline"
          width="auto"
          @click="cancelProcessing"
        >
          Cancelar procesamiento
        </UiButton>
        <UiButton
          v-else
          variant="outline"
          width="auto"
          :disabled="isBusy"
          @click="requestClose"
        >
          Cancelar
        </UiButton>
        <UiButton type="submit" width="auto" :disabled="!canSubmit" :loading="isBusy">
          Procesar y guardar
        </UiButton>
      </div>
    </template>
  </UiFormModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IconCircleCheck } from '@tabler/icons-vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';
import UiSteps from '@/components/ui/UiSteps.vue';
import UiStatList from '@/components/ui/UiStatList.vue';
import type { StatItem } from '@/components/ui/UiStatList.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useEnergyStore } from '@/stores/energy.store';
import { useToast } from '@/composables/useToast';
import {
  ENERGY_FILE_ACCEPT,
  ENERGY_MAX_FILE_SIZE,
  validateEnergyFile,
} from '@/utils/energy-file';
import { formatInteger, formatPercent } from '@/utils/number';
import { apiErrorMessage } from '@/utils/error';
import type { Analysis } from '@/types/analysis';
import type { EnergyDashboard } from '@/types/energy';

type Phase = 'idle' | 'processing' | 'saving' | 'save-error' | 'success';

const STEPS = [
  { number: 1, label: 'Archivo' },
  { number: 2, label: 'Procesar' },
  { number: 3, label: 'Guardar' },
] as const;

const emit = defineEmits<{
  created: [analysis: Analysis];
  view: [analysis: Analysis];
}>();

const isOpen = defineModel<boolean>({ default: false });
const analysisStore = useAnalysisStore();
const energyStore = useEnergyStore();
const toast = useToast();

const name = ref('');
const selectedFile = ref<File | null>(null);
const localError = ref('');
const phase = ref<Phase>('idle');
const savedAnalysis = ref<Analysis | null>(null);
const lastResult = ref<EnergyDashboard | null>(null);
const wasCanceled = ref(false);

const isBusy = computed(() => phase.value === 'processing' || phase.value === 'saving');
const isSuccess = computed(() => phase.value === 'success');
const currentStep = computed(() => {
  if (phase.value === 'processing') return 2;
  if (phase.value === 'saving' || phase.value === 'save-error' || phase.value === 'success') {
    return 3;
  }
  return 1;
});
const successStats = computed<StatItem[]>(() => {
  const result = lastResult.value;
  if (!result) return [];
  return [
    { label: 'Registros procesados', value: formatInteger(result.meta.rowsProcessed) },
    { label: 'Pérdidas no técnicas', value: formatPercent(result.kpis.nonTechnicalLossesPct) },
    { label: 'Zonas críticas', value: formatInteger(result.criticalZones.length) },
  ];
});
const canSubmit = computed(
  () => !!name.value.trim() && !!selectedFile.value && !isBusy.value,
);
const isDirty = computed(
  () => !isSuccess.value && (name.value.trim().length > 0 || selectedFile.value !== null),
);
const displayError = computed(() => localError.value || energyStore.error || '');
const progress = computed(() => (phase.value === 'saving' ? 100 : energyStore.progress));
const progressLabel = computed(() =>
  phase.value === 'saving'
    ? 'Guardando análisis…'
    : `Procesando ${selectedFile.value?.name || 'archivo'}…`,
);

function suggestedName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function resetState() {
  energyStore.reset();
  name.value = '';
  selectedFile.value = null;
  localError.value = '';
  phase.value = 'idle';
  savedAnalysis.value = null;
  lastResult.value = null;
  wasCanceled.value = false;
}

watch(
  () => isOpen.value,
  (open) => {
    if (open) resetState();
  },
);

function selectFile(file: File) {
  const validationError = validateEnergyFile(file);
  localError.value = validationError ?? '';

  if (validationError) {
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
  if (!name.value.trim()) name.value = suggestedName(file.name);
  energyStore.clearError();
  phase.value = 'idle';
  wasCanceled.value = false;
}

function handleFileUpdate(file: File | null) {
  if (!file) {
    clearFile();
    return;
  }

  selectFile(file);
}

function clearFile() {
  selectedFile.value = null;
  localError.value = '';
}

async function saveResult(result: EnergyDashboard) {
  if (!selectedFile.value) return;

  phase.value = 'saving';
  localError.value = '';
  try {
    const created = await analysisStore.createAnalysis({
      name: name.value.trim(),
      analysis_type: 'energy',
      file_name: selectedFile.value.name,
      file_size: selectedFile.value.size,
      result: result as unknown as Record<string, unknown>,
    });
    savedAnalysis.value = created;
    phase.value = 'success';
    emit('created', created);
    toast.success('Análisis guardado correctamente');
  } catch (err: unknown) {
    phase.value = 'save-error';
    localError.value = apiErrorMessage(err, 'Error al guardar el análisis');
  }
}

async function handleSubmit() {
  if (isBusy.value || isSuccess.value) return;

  if (!name.value.trim()) {
    localError.value = 'Escribe un nombre para el análisis.';
    return;
  }
  if (!selectedFile.value) {
    localError.value = 'Selecciona un archivo de Excel.';
    return;
  }

  localError.value = '';
  wasCanceled.value = false;
  phase.value = 'processing';
  const result = await energyStore.upload(selectedFile.value);

  if (!result) {
    if (wasCanceled.value) {
      wasCanceled.value = false;
      phase.value = 'idle';
      return;
    }
    phase.value = 'idle';
    localError.value = energyStore.error || 'No pudimos procesar el archivo.';
    return;
  }

  lastResult.value = result;
  await saveResult(result);
}

function cancelProcessing() {
  wasCanceled.value = true;
  energyStore.reset();
  phase.value = 'idle';
  toast.info('Procesamiento cancelado');
}

async function retrySave() {
  if (!lastResult.value) return;
  await saveResult(lastResult.value);
}

function startAnother() {
  resetState();
}

function viewSaved() {
  if (!savedAnalysis.value) return;
  emit('view', savedAnalysis.value);
  isOpen.value = false;
}
</script>

<style scoped>
.success-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-success-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-success-bg);
}

.success-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.success-kpis {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-success-border);
}

.success-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background-color: var(--bg-card);
  color: var(--color-success);
}

.success-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-success-text);
}

.success-text {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.error-hint {
  margin: calc(var(--space-2) * -1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.progress-value {
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-green), var(--accent-blue));
  transition: width 0.2s ease;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
