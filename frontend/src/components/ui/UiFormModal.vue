<template>
  <UiModal
    ref="modalRef"
    v-model="isOpen"
    :size="size"
    :label="title || 'Formulario'"
    :labelledby="$slots.header || !title ? undefined : titleId"
    :describedby="$slots.header || !description ? undefined : descriptionId"
    :show-close="showClose"
    :confirm-on-dirty="confirmOnDirty"
    :dirty="dirty"
    :confirm-message="confirmMessage"
    :prevent-close="preventClose"
  >
    <template v-if="title || description || $slots.header || $slots.icon" #header>
      <slot name="header">
        <div class="form-modal-heading">
          <span v-if="$slots.icon" class="form-modal-icon">
            <slot name="icon" />
          </span>
          <div class="form-modal-copy">
            <h2 :id="titleId" class="form-modal-title">{{ title }}</h2>
            <p v-if="description" :id="descriptionId" class="form-modal-description">
              {{ description }}
            </p>
          </div>
        </div>
      </slot>
    </template>

    <form :id="formId" ref="formRef" class="ui-form-modal" @submit.prevent="emit('submit')">
      <div class="form-body">
        <slot></slot>
      </div>
    </form>

    <template v-if="!hideFooter" #footer>
      <slot
        name="footer"
        :request-close="requestClose"
        :form-id="formId"
        :submit="submitForm"
      >
        <div class="form-modal-footer">
          <p v-if="footerHint" class="form-footer-hint">{{ footerHint }}</p>
          <div class="form-modal-actions">
            <UiButton type="button" variant="outline" width="auto" @click="requestClose">
              {{ cancelLabel }}
            </UiButton>
            <UiButton
              type="submit"
              :form="formId"
              width="auto"
              :loading="loading"
            >
              {{ submitLabel }}
            </UiButton>
          </div>
        </div>
      </slot>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import UiModal from './UiModal.vue';
import UiButton from './UiButton.vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    size?: 'small' | 'default' | 'large';
    dirty?: boolean;
    confirmOnDirty?: boolean;
    confirmMessage?: string;
    preventClose?: boolean;
    showClose?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    hideFooter?: boolean;
    footerHint?: string;
  }>(),
  {
    title: '',
    description: '',
    size: 'default',
    dirty: false,
    confirmOnDirty: false,
    confirmMessage: 'Tienes cambios sin guardar. ¿Cerrar de todos modos?',
    preventClose: false,
    showClose: true,
    submitLabel: 'Guardar',
    cancelLabel: 'Cancelar',
    loading: false,
    hideFooter: false,
    footerHint: '',
  },
);

const isOpen = defineModel<boolean>({ default: false });

const emit = defineEmits<{ (e: 'submit'): void }>();

const modalRef = ref<InstanceType<typeof UiModal> | null>(null);
const formRef = ref<HTMLFormElement | null>(null);
const formId = `form-modal-${useId()}`;
const titleId = `form-modal-title-${useId()}`;
const descriptionId = `form-modal-description-${useId()}`;

const requestClose = () => modalRef.value?.attemptClose();

const submitForm = () => {
  formRef.value?.requestSubmit();
};

defineExpose({ requestClose, submitForm });
</script>

<style scoped>
.ui-form-modal {
  display: block;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.form-modal-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding-right: var(--space-2);
}

.form-modal-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-hover);
  color: var(--text-muted);
}

.form-modal-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.form-modal-title {
  font-size: var(--text-xl);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.form-modal-description {
  max-width: 62ch;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-muted);
}

.form-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.form-footer-hint {
  max-width: 38ch;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-muted);
}

.form-modal-actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
  margin-left: auto;
}

.form-modal-actions :deep(.ui-button) {
  min-width: 7.5rem;
}

@media (max-width: 640px) {
  .form-modal-heading {
    gap: var(--space-3);
  }

  .form-modal-title {
    font-size: var(--text-lg);
  }

  .form-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .form-footer-hint {
    max-width: none;
  }

  .form-modal-actions {
    flex-direction: column-reverse;
    margin-left: 0;
  }

  .form-modal-actions :deep(.ui-button) {
    width: 100%;
  }
}
</style>
