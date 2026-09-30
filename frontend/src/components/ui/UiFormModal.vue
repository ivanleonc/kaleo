<template>
  <UiModal
    ref="modalRef"
    v-model="isOpen"
    :size="size"
    :label="title"
    :confirm-on-dirty="confirmOnDirty"
    :dirty="dirty"
    :confirm-message="confirmMessage"
  >
    <form class="ui-form-modal" @submit.prevent="emit('submit')">
      <UiCard>
        <template v-if="title || $slots.header" #header>
          <slot name="header">
            <h3 class="form-modal-title">{{ title }}</h3>
            <p v-if="description" class="form-modal-description">{{ description }}</p>
          </slot>
        </template>

        <div class="form-body">
          <slot></slot>
        </div>

        <template v-if="$slots.footer" #footer>
          <slot name="footer" :request-close="requestClose"></slot>
        </template>
      </UiCard>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UiModal from './UiModal.vue';
import UiCard from './UiCard.vue';

/**
 * Modal de formulario: UiModal + UiCard + encabezado y pie estándar.
 *
 * Antes cada vista repetía el mismo bloque de marcado (modal, card, header
 * con título y descripción, body, footer con cancelar/guardar) y además
 * cableaba `confirm-on-dirty` a mano, lo que producía inconsistencias.
 */
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    size?: 'small' | 'default' | 'large';
    dirty?: boolean;
    confirmOnDirty?: boolean;
    confirmMessage?: string;
  }>(),
  {
    title: '',
    description: '',
    size: 'default',
    dirty: false,
    confirmOnDirty: false,
    confirmMessage: 'Tienes cambios sin guardar. ¿Cerrar de todos modos?',
  },
);

const isOpen = defineModel<boolean>({ default: false });

const emit = defineEmits<{ (e: 'submit'): void }>();

const modalRef = ref<InstanceType<typeof UiModal> | null>(null);

/**
 * Expuesto al slot `footer` para que el botón Cancelar pase por la misma
 * comprobación de cambios sin guardar que el overlay y la tecla Escape.
 * Sin esto, `v-model = false` en el botón descartaba el formulario en silencio.
 */
const requestClose = () => modalRef.value?.attemptClose();

defineExpose({ requestClose });
</script>

<style scoped>
.ui-form-modal {
  display: block;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
