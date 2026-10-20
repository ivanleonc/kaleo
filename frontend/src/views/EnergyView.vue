<template>
  <AuthenticatedLayout>
    <div class="energy-page">
      <UiPageHeader
        title="Energía"
        subtitle="Carga la facturación en Excel y visualiza consumo, pérdidas no técnicas y anomalías operativas."
      >
        <template #actions>
          <input
            v-if="store.dashboard"
            ref="replaceInput"
            class="hidden-file"
            type="file"
            :accept="ENERGY_FILE_ACCEPT"
            tabindex="-1"
            aria-hidden="true"
            @change="handleReplaceFile"
          />
          <UiButton
            v-if="store.dashboard"
            variant="outline"
            width="auto"
            :loading="store.isUploading"
            @click="openReplacePicker"
          >
            <IconUpload :size="16" />
            Cargar otro archivo
          </UiButton>
        </template>
      </UiPageHeader>

      <div
        v-if="store.dashboard && store.isUploading"
        class="replace-progress"
        role="status"
        aria-live="polite"
      >
        <div class="replace-progress-header">
          <span>Procesando {{ store.pendingFileName || 'nuevo archivo' }}…</span>
          <strong>{{ store.progress }}%</strong>
        </div>
        <div
          class="progress-track"
          role="progressbar"
          aria-label="Progreso de carga del nuevo archivo"
          :aria-valuenow="store.progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :style="{ width: `${store.progress}%` }"></div>
        </div>
      </div>

      <UiAlert v-if="displayReplacementError" type="error">
        <template #title>No pudimos procesar el archivo</template>
        {{ displayReplacementError }}
        <div v-if="lastReplacementFile" class="alert-action">
          <UiButton size="sm" variant="outline" width="auto" @click="retryReplacement">
            Reintentar
          </UiButton>
        </div>
      </UiAlert>

      <EnergyUploadPanel
        v-if="!store.dashboard"
        :is-uploading="store.isUploading"
        :progress="store.progress"
        :error="store.error"
        :pending-file-name="store.pendingFileName"
        @submit="handleFirstUpload"
        @clear-error="store.clearError"
      />

      <EnergyDashboard
        v-else
        :dashboard="store.dashboard"
      />
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IconUpload } from '@tabler/icons-vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import EnergyUploadPanel from '@/components/features/energy/EnergyUploadPanel.vue';
import EnergyDashboard from '@/components/features/energy/EnergyDashboard.vue';
import { useEnergyStore } from '@/stores/energy.store';
import { useToast } from '@/composables/useToast';
import { ENERGY_FILE_ACCEPT, validateEnergyFile } from '@/utils/energy-file';

const store = useEnergyStore();
const toast = useToast();

const replaceInput = ref<HTMLInputElement | null>(null);
const replacementError = ref<string | null>(null);
const lastReplacementFile = ref<File | null>(null);

const displayReplacementError = computed(
  () => replacementError.value || (store.dashboard ? store.error : null),
);

function openReplacePicker() {
  store.clearError();
  replacementError.value = null;
  lastReplacementFile.value = null;
  replaceInput.value?.click();
}

async function uploadFile(file: File) {
  const result = await store.upload(file);
  if (result) {
    toast.success('Dashboard generado correctamente');
  }
  return result;
}

async function handleFirstUpload(file: File) {
  replacementError.value = null;
  await uploadFile(file);
}

async function handleReplaceFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  const validationError = validateEnergyFile(file);
  if (validationError) {
    store.clearError();
    replacementError.value = validationError;
    lastReplacementFile.value = null;
    return;
  }

  replacementError.value = null;
  lastReplacementFile.value = file;
  const result = await uploadFile(file);
  if (result) lastReplacementFile.value = null;
}

async function retryReplacement() {
  if (!lastReplacementFile.value) return;
  replacementError.value = null;
  const result = await uploadFile(lastReplacementFile.value);
  if (result) lastReplacementFile.value = null;
}
</script>

<style scoped>
.energy-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.hidden-file {
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

.replace-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.replace-progress-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.replace-progress-header strong {
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

.alert-action {
  margin-top: var(--space-2);
  display: flex;
}
</style>
