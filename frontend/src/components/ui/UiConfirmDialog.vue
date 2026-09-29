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

      <template #footer>
        <div class="confirm-footer">
          <UiButton variant="outline" :disabled="loading" @click="isOpen = false">
            {{ cancelLabel }}
          </UiButton>
          <UiButton
            :variant="variant === 'danger' ? 'danger' : 'primary'"
            :loading="loading"
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
import UiModal from './UiModal.vue';
import UiCard from './UiCard.vue';
import UiButton from './UiButton.vue';
import UiAlert from './UiAlert.vue';

/**
 * Confirmación de acciones destructivas.
 *
 * Eliminar sede, rol o miembro repetía el mismo bloque modal + card + dos
 * botones en cada vista, y `UiFormModal` no servía porque no es un formulario.
 * Sin `confirmOnDirty` a propósito: una confirmación nunca tiene formulario
 * que pueda quedar sin guardar.
 */
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    variant?: 'danger' | 'primary';
    error?: string | null;
  }>(),
  {
    title: 'Confirmar acción',
    description: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    variant: 'danger',
    error: null,
  },
);

const isOpen = defineModel<boolean>({ default: false });

const emit = defineEmits<{ (e: 'confirm'): void }>();
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
</style>
