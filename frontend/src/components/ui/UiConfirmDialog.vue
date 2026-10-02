<template>
  <UiModal v-model="isOpen" size="small" :label="title">
    <UiCard>
      <template v-if="title" #header>
        <h3 class="confirm-title" :class="`confirm-${variant}`">{{ title }}</h3>
        <p v-if="description" class="confirm-description">
          <slot>{{ description }}</slot>
        </p>
      </template>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div v-if="requireTypedConfirmation" class="typed-confirm">
        <p class="typed-confirm-hint">
          Para confirmar, escribe <code class="typed-confirm-code">{{ requireTypedConfirmation }}</code>
        </p>
        <UiInput
          v-model="typedValue"
          :aria-label="`Escribe ${requireTypedConfirmation} para confirmar`"
          :placeholder="requireTypedConfirmation"
          autocomplete="off"
        />
      </div>

      <template #footer>
        <div class="confirm-footer">
          <UiButton variant="outline" :disabled="loading" @click="onCancel">
            {{ cancelLabel }}
          </UiButton>
          <UiButton
            :variant="variant === 'danger' ? 'danger' : 'primary'"
            :loading="loading"
            :disabled="!canConfirm"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </UiButton>
        </div>
      </template>
    </UiCard>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UiModal from './UiModal.vue';
import UiCard from './UiCard.vue';
import UiButton from './UiButton.vue';
import UiAlert from './UiAlert.vue';
import UiInput from './UiInput.vue';

/**
 * Confirmación de acciones destructivas.
 *
 * Eliminar sede, rol o miembro repetía el mismo bloque modal + card + dos
 * botones en cada vista, y `UiFormModal` no servía porque no es un formulario.
 * Sin `confirmOnDirty` a propósito: una confirmación nunca tiene formulario
 * que pueda quedar sin guardar.
 *
 * `requireTypedConfirmation`: para acciones de alto impacto (ej. borrar un
 * rol con miembros asignados) exige escribir el texto exacto antes de
 * habilitar el botón de confirmar. Sin esta prop el dialog funciona igual
 * que antes (un solo click).
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    variant?: 'danger' | 'primary';
    error?: string | null;
    requireTypedConfirmation?: string | null;
  }>(),
  {
    title: 'Confirmar acción',
    description: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    variant: 'danger',
    error: null,
    requireTypedConfirmation: null,
  },
);

const isOpen = defineModel<boolean>({ default: false });

const emit = defineEmits<{ (e: 'confirm'): void }>();

const typedValue = ref('');

watch(isOpen, (open) => {
  if (open) typedValue.value = '';
});

const canConfirm = computed(() => {
  if (!props.requireTypedConfirmation) return true;
  return typedValue.value.trim() === props.requireTypedConfirmation;
});

const onCancel = () => {
  typedValue.value = '';
  isOpen.value = false;
};
</script>

<style scoped>
.confirm-title {
  font-size: var(--text-md);
  font-weight: 600;
  line-height: 1.25;
}

.confirm-title.confirm-danger {
  color: var(--color-danger-text);
}

.confirm-description {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.confirm-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.typed-confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.typed-confirm-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.typed-confirm-code {
  font-family: ui-monospace, monospace;
  font-weight: 600;
  color: var(--text-main);
  background-color: var(--bg-hover);
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
}
</style>
