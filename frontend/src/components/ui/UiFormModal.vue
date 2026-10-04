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

        <!--
          Footer con dos modos:
          1. Slot #footer (prioridad): el consumidor controla completamente los
             botones — igual que antes, sin cambios de comportamiento.
          2. Footer por defecto (nuevo): si no se provee #footer pero se pasan
             las props `submit-label` o `cancel-label`, se renderiza un footer
             estándar Cancel/Submit. Reduce de ~8 líneas de template por vista
             a 0 en casos simples.

          Nota: `hideFooter` suprime el footer por completo (útil en modales
          de solo lectura o donde el submit se maneja externamente).
        -->
        <template v-if="!hideFooter" #footer>
          <slot name="footer" :request-close="requestClose">
            <div class="modal-footer">
              <UiButton type="button" variant="outline" @click="requestClose">
                {{ cancelLabel }}
              </UiButton>
              <UiButton type="submit" :loading="loading">
                {{ submitLabel }}
              </UiButton>
            </div>
          </slot>
        </template>
      </UiCard>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UiModal from './UiModal.vue';
import UiCard from './UiCard.vue';
import UiButton from './UiButton.vue';

/**
 * Modal de formulario: UiModal + UiCard + encabezado y pie estándar.
 *
 * Antes cada vista repetía el mismo bloque de marcado (modal, card, header
 * con título y descripción, body, footer con cancelar/guardar) y además
 * cableaba `confirm-on-dirty` a mano, lo que producía inconsistencias.
 *
 * ## Footer por defecto (nuevo)
 * Cuando no se provee el slot `#footer`, el modal renderiza automáticamente
 * un par Cancelar/Guardar configurables via props:
 *
 * ```html
 * <!-- Sin footer en el template: UiFormModal lo genera -->
 * <UiFormModal
 *   v-model="isOpen"
 *   title="Nueva Sede"
 *   submit-label="Crear Sede"
 *   :loading="branchStore.isLoading"
 *   @submit="handleSubmit"
 * >
 *   <!-- solo el body del formulario -->
 * </UiFormModal>
 * ```
 *
 * El slot `#footer` sigue disponible para casos que necesiten control total
 * (múltiples botones, lógica condicional, etc.) — retrocompatibilidad 100%.
 */
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    size?: 'small' | 'default' | 'large';
    dirty?: boolean;
    confirmOnDirty?: boolean;
    confirmMessage?: string;
    /** Texto del botón de envío en el footer por defecto. */
    submitLabel?: string;
    /** Texto del botón de cancelar en el footer por defecto. */
    cancelLabel?: string;
    /** Estado de carga del botón de envío (spinner). */
    loading?: boolean;
    /** Suprime completamente el footer (sin botones). */
    hideFooter?: boolean;
  }>(),
  {
    title: '',
    description: '',
    size: 'default',
    dirty: false,
    confirmOnDirty: false,
    confirmMessage: 'Tienes cambios sin guardar. ¿Cerrar de todos modos?',
    submitLabel: 'Guardar',
    cancelLabel: 'Cancelar',
    loading: false,
    hideFooter: false,
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

/* Footer por defecto — mismo estilo que el .modal-footer de las vistas. */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
