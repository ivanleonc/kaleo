<template>
  <UiButton
    type="button"
    variant="outline"
    width="auto"
    :loading="isExporting"
    :disabled="disabled"
    @click="handleExport"
  >
    <IconDownload :size="16" /> {{ label }}
  </UiButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconDownload } from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';
import { downloadBlob } from '@/utils/csv';
import UiButton from '@/components/ui/UiButton.vue';

const props = withDefaults(defineProps<{
  label?: string;
  disabled?: boolean;
  fetcher: () => Promise<{ blob: Blob; filename: string }>;
}>(), {
  label: 'Exportar CSV',
  disabled: false,
});

const toast = useToast();
const isExporting = ref(false);

const handleExport = async () => {
  isExporting.value = true;
  toast.info('Preparando exportación…');
  try {
    const { blob, filename } = await props.fetcher();
    downloadBlob(blob, filename);
    toast.success('Archivo exportado correctamente');
  } catch {
    // El detalle ya vive en el store/servicio si aplica; aquí mensaje accionable.
    toast.error('No se pudo exportar el archivo');
  } finally {
    isExporting.value = false;
  }
};
</script>
