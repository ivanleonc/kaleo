<template>
  <UiDropdown ref="dropdownRef" label="Exportar tabla" :min-width="200">
    <template #trigger="{ toggle, triggerAria }">
      <UiButton
        v-bind="triggerAria"
        variant="outline"
        size="sm"
        width="auto"
        :loading="isExporting"
        :disabled="disabled"
        @click="toggle"
      >
        <IconDownload v-if="!isExporting" :size="16" stroke-width="1.8" aria-hidden="true" />
        {{ label }}
      </UiButton>
    </template>

    <div class="export-menu">
      <button
        type="button"
        role="menuitem"
        class="export-item"
        :disabled="isExporting"
        @click="handleExport('csv')"
      >
        <IconFileText :size="16" stroke-width="1.8" aria-hidden="true" />
        <span>CSV</span>
      </button>
      <button
        type="button"
        role="menuitem"
        class="export-item"
        :disabled="isExporting"
        @click="handleExport('xlsx')"
      >
        <IconFileSpreadsheet :size="16" stroke-width="1.8" aria-hidden="true" />
        <span>Excel (.xlsx)</span>
      </button>
    </div>
  </UiDropdown>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
} from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import { downloadBlob } from '@/utils/csv';
import type { ExportedFile, ExportFormat } from '@/api/export';
import UiButton from './UiButton.vue';
import UiDropdown from './UiDropdown.vue';

const props = withDefaults(defineProps<{
  fetcher: (format: ExportFormat) => Promise<ExportedFile>;
  label?: string;
  disabled?: boolean;
}>(), {
  label: 'Exportar',
  disabled: false,
});

const toast = useToast();
const dropdownRef = ref<InstanceType<typeof UiDropdown> | null>(null);
const exportingFormat = ref<ExportFormat | null>(null);

const isExporting = computed(() => exportingFormat.value !== null);

const handleExport = async (format: ExportFormat) => {
  if (isExporting.value) return;

  exportingFormat.value = format;
  dropdownRef.value?.closeAndFocus();
  toast.info('Preparando exportación…');

  try {
    const { blob, filename } = await props.fetcher(format);
    downloadBlob(blob, filename);
    toast.success('Archivo exportado correctamente');
  } catch (error) {
    toast.error(apiErrorMessage(error, 'No se pudo exportar el archivo'));
  } finally {
    exportingFormat.value = null;
  }
};
</script>

<style scoped>
.export-menu {
  display: flex;
  flex-direction: column;
}

.export-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.25rem;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.export-item:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-main);
}

.export-item:focus-visible {
  outline: 2px solid var(--text-main);
  outline-offset: -2px;
}

.export-item:disabled {
  cursor: default;
  opacity: 0.55;
}

@media (pointer: coarse) {
  .export-item {
    min-height: 44px;
  }
}
</style>
