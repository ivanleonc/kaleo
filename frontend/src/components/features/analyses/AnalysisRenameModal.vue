<template>
  <UiFormModal
    v-model="isOpen"
    title="Renombrar análisis"
    :description="analysis ? `Nombre actual: ${analysis.name}` : 'Escribe un nombre para identificar el análisis.'"
    :confirm-on-dirty="true"
    :dirty="isDirty"
    submit-label="Guardar nombre"
    :loading="analysisStore.isLoading"
    footer-hint="El nuevo nombre se mostrará en el historial de análisis."
    @submit="handleSubmit"
  >
    <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
    <UiInput
      v-model="name"
      label="Nombre del análisis"
      placeholder="Ej. Facturación enero 2026"
      required
    />
  </UiFormModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type { Analysis } from '@/types/analysis';

const props = defineProps<{
  analysis: Analysis | null;
}>();

const emit = defineEmits<{
  saved: [analysis: Analysis];
}>();

const isOpen = defineModel<boolean>({ default: false });
const analysisStore = useAnalysisStore();
const toast = useToast();

const name = ref('');
const error = ref('');
const { isDirty, capture } = useDirtyForm(() => ({ name: name.value }));

watch(
  () => [isOpen.value, props.analysis?.id] as const,
  ([open]) => {
    if (!open) return;
    name.value = props.analysis?.name ?? '';
    error.value = '';
    capture();
  },
  { immediate: true },
);

const handleSubmit = async () => {
  const nextName = name.value.trim();
  if (!nextName) {
    error.value = 'El nombre es requerido.';
    return;
  }
  if (!props.analysis) return;

  error.value = '';
  try {
    const updated = await analysisStore.renameAnalysis(props.analysis.id, nextName);
    emit('saved', updated);
    isOpen.value = false;
    toast.success('Análisis renombrado correctamente');
  } catch (err: unknown) {
    error.value = apiErrorMessage(err, 'Error al renombrar el análisis');
  }
};
</script>
