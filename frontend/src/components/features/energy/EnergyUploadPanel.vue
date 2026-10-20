<template>
  <section class="upload-card" aria-labelledby="energy-upload-title">
    <div class="upload-heading">
      <div class="upload-icon">
        <IconBolt :size="24" stroke-width="1.8" />
      </div>
      <div>
        <h2 id="energy-upload-title" class="upload-title">Carga tu archivo de facturación</h2>
        <p class="upload-subtitle">
          Sube el Excel con la información de clientes, consumo y pérdidas para generar el tablero operativo.
        </p>
      </div>
    </div>

    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- el área de arrastre delega la interacción de teclado y clic al input de archivo accesible. -->
    <label
      for="energy-file-input"
      class="dropzone"
      :class="{ 'is-dragging': isDragging, 'is-uploading': isUploading }"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        id="energy-file-input"
        ref="fileInput"
        class="file-input"
        type="file"
        :accept="ENERGY_FILE_ACCEPT"
        :disabled="isUploading"
        aria-describedby="energy-upload-hint"
        @change="handleInputChange"
      />
      <span class="dropzone-label">
        <IconFileSpreadsheet class="dropzone-icon" :size="38" stroke-width="1.4" />
        <span class="dropzone-title">
          Arrastra el archivo aquí o <span class="dropzone-link">selecciónalo</span>
        </span>
        <span id="energy-upload-hint" class="dropzone-hint">
          Formatos .xlsx y .xls · Máximo 10 MB
        </span>
      </span>
    </label>

    <UiAlert v-if="displayError" type="error">{{ displayError }}</UiAlert>

    <div v-if="selectedFile" class="file-row">
      <div class="file-main">
        <IconFileSpreadsheet :size="20" stroke-width="1.8" />
        <div class="file-text">
          <span class="file-name" :title="selectedFile.name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
        </div>
      </div>
      <button
        v-if="!isUploading"
        type="button"
        class="file-remove"
        :aria-label="`Quitar ${selectedFile.name}`"
        @click="clearFile"
      >
        <IconX :size="16" stroke-width="1.8" />
      </button>
    </div>

    <div v-if="isUploading" class="progress-block" role="status" aria-live="polite">
      <div class="progress-header">
        <span>Procesando {{ pendingFileName || selectedFile?.name || 'archivo' }}…</span>
        <span class="progress-value">{{ progress }}%</span>
      </div>
      <div
        class="progress-track"
        role="progressbar"
        aria-label="Progreso de carga del archivo"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <div class="upload-actions">
      <UiButton
        :disabled="!selectedFile || isUploading"
        :loading="isUploading"
        width="auto"
        @click="submit"
      >
        <IconUpload :size="16" />
        Procesar archivo
      </UiButton>
      <p class="upload-footnote">
        El archivo se envía al servicio de analítica y no se almacena en el navegador.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IconBolt,
  IconFileSpreadsheet,
  IconUpload,
  IconX,
} from '@tabler/icons-vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiButton from '@/components/ui/UiButton.vue';
import {
  ENERGY_FILE_ACCEPT,
  validateEnergyFile,
} from '@/utils/energy-file';
import { formatFileSize } from '@/utils/number';

const props = withDefaults(
  defineProps<{
    isUploading?: boolean;
    progress?: number;
    error?: string | null;
    pendingFileName?: string | null;
  }>(),
  {
    isUploading: false,
    progress: 0,
    error: null,
    pendingFileName: null,
  },
);

const emit = defineEmits<{
  submit: [file: File];
  'clear-error': [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const localError = ref<string | null>(null);
const isDragging = ref(false);

const displayError = computed(() => localError.value || props.error);

function selectFile(file: File) {
  const validationError = validateEnergyFile(file);
  localError.value = validationError;

  if (validationError) {
    selectedFile.value = null;
    return;
  }

  selectedFile.value = file;
  emit('clear-error');
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
  localError.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function submit() {
  if (!selectedFile.value || props.isUploading) return;
  emit('submit', selectedFile.value);
}
</script>

<style scoped>
.upload-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-8);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.upload-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--accent-green), var(--accent-blue));
}

.upload-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.upload-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background-color: var(--accent-green-bg);
  color: var(--accent-green);
}

.upload-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-main);
}

.upload-subtitle {
  margin: var(--space-1) 0 0;
  max-width: 62ch;
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.dropzone {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 220px;
  padding: var(--space-8);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--bg-app);
  transition: border-color 0.15s, background-color 0.15s;
}

.dropzone:hover,
.dropzone:focus-within,
.dropzone.is-dragging {
  border-color: var(--primary);
  background-color: var(--color-primary-light);
}

.dropzone.is-uploading {
  pointer-events: none;
  opacity: 0.7;
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

.dropzone-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  text-align: center;
}

.dropzone-icon {
  color: var(--primary);
}

.dropzone-title {
  font-size: var(--text-base);
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

.upload-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.upload-footnote {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .upload-card {
    padding: var(--space-5);
  }

  .dropzone {
    min-height: 180px;
    padding: var(--space-5);
  }

  .upload-actions {
    align-items: stretch;
  }

  .upload-actions :deep(.ui-button) {
    width: 100%;
  }
}
</style>
