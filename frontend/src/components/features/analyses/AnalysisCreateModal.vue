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
      <dl v-if="lastResult" class="success-kpis">
        <div>
          <dt>Registros procesados</dt>
          <dd>{{ formatInteger(lastResult.meta.rowsProcessed) }}</dd>
        </div>
        <div>
          <dt>Pérdidas no técnicas</dt>
          <dd>{{ formatPercent(lastResult.kpis.nonTechnicalLossesPct) }}</dd>
        </div>
        <div>
          <dt>Zonas críticas</dt>
          <dd>{{ formatInteger(lastResult.criticalZones.length) }}</dd>
        </div>
      </dl>
    </div>

    <template v-else>
      <ol class="upload-steps" aria-label="Pasos para guardar el análisis">
        <li
          v-for="step in STEPS"
          :key="step.number"
          class="upload-step"
          :class="stepClass(step.number)"
          :aria-current="currentStep === step.number ? 'step' : undefined"
        >
          <span class="step-number">
            <IconCheck v-if="stepClass(step.number) === 'is-done'" :size="14" stroke-width="2.2" />
            <template v-else>{{ step.number }}</template>
          </span>
          <span class="step-label">{{ step.label }}</span>
        </li>
      </ol>

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

      <div class="dropzone-block">
        <span class="field-label">Archivo de facturación</span>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- el arrastre complementa el input de archivo accesible. -->
        <label
          for="analysis-file-input"
          class="dropzone"
          :class="{ 'is-dragging': isDragging, 'is-disabled': isBusy }"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            id="analysis-file-input"
            ref="fileInput"
            class="file-input"
            type="file"
            :accept="ENERGY_FILE_ACCEPT"
            :disabled="isBusy"
            aria-describedby="analysis-file-hint"
            @change="handleInputChange"
          />
          <span class="dropzone-content">
            <IconFileSpreadsheet class="dropzone-icon" :size="32" stroke-width="1.5" />
            <span class="dropzone-title">
              Arrastra el Excel aquí o <span class="dropzone-link">selecciónalo</span>
            </span>
            <span id="analysis-file-hint" class="dropzone-hint">
              Formatos .xlsx y .xls · Máximo 10 MB
            </span>
          </span>
        </label>
      </div>

      <div v-if="selectedFile" class="file-row">
        <div class="file-main">
          <IconFileSpreadsheet :size="20" stroke-width="1.8" />
          <div class="file-text">
            <span class="file-name" :title="selectedFile.name">{{ selectedFile.name }}</span>
            <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
          </div>
        </div>
        <button
          v-if="!isBusy"
          type="button"
          class="file-remove"
          :aria-label="`Quitar ${selectedFile.name}`"
          @click="clearFile"
        >
          <IconX :size="16" stroke-width="1.8" />
        </button>
      </div>

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
import {
  IconCheck,
  IconCircleCheck,
  IconFileSpreadsheet,
  IconX,
} from '@tabler/icons-vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useEnergyStore } from '@/stores/energy.store';
import { useToast } from '@/composables/useToast';
import { ENERGY_FILE_ACCEPT, validateEnergyFile } from '@/utils/energy-file';
import { formatFileSize, formatInteger, formatPercent } from '@/utils/number';
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
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
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

function stepClass(step: number): string {
  if (isSuccess.value) return 'is-done';
  if (phase.value === 'save-error' && step === 3) return 'is-error';
  if (step < currentStep.value) return 'is-done';
  if (step === currentStep.value) return 'is-current';
  return 'is-pending';
}
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
  isDragging.value = false;
  localError.value = '';
  phase.value = 'idle';
  savedAnalysis.value = null;
  lastResult.value = null;
  wasCanceled.value = false;
  if (fileInput.value) fileInput.value.value = '';
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

function handleInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) selectFile(file);
  input.value = '';
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) selectFile(file);
}

function clearFile() {
  selectedFile.value = null;
  localError.value = '';
  if (fileInput.value) fileInput.value.value = '';
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-success-border);
}

.success-kpis div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.success-kpis dt {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.success-kpis dd {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
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

.upload-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.upload-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.step-number {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-step.is-current {
  border-color: var(--primary);
  background-color: var(--color-primary-light);
  color: var(--text-main);
  font-weight: 600;
}

.upload-step.is-current .step-number {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.upload-step.is-done {
  border-color: var(--color-success-border);
  color: var(--color-success-text);
}

.upload-step.is-done .step-number {
  background-color: var(--color-success);
  color: #fff;
}

.upload-step.is-error {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.upload-step.is-error .step-number {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.error-hint {
  margin: calc(var(--space-2) * -1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.dropzone-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1;
}

.dropzone {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 160px;
  padding: var(--space-6);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--bg-app);
  transition: border-color 0.15s, background-color 0.15s;
  cursor: pointer;
}

.dropzone:hover,
.dropzone:focus-within,
.dropzone.is-dragging {
  border-color: var(--primary);
  background-color: var(--color-primary-light);
}

.dropzone.is-disabled {
  pointer-events: none;
  opacity: 0.65;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.dropzone-icon {
  color: var(--primary);
}

.dropzone-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.dropzone-link {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.dropzone-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.file-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  color: var(--primary);
}

.file-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.file-remove {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.file-remove:hover {
  background-color: var(--bg-card);
  color: var(--color-danger);
}

.file-remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
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
  .dropzone {
    min-height: 140px;
    padding: var(--space-5);
  }

  .upload-steps {
    grid-template-columns: 1fr;
  }

  .success-kpis {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .success-kpis div {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
