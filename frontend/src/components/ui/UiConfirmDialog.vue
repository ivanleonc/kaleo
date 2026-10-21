<template>
  <UiModal
    v-model="isOpen"
    size="small"
    :label="title"
    :labelledby="titleId"
    :describedby="description || $slots.default ? descriptionId : undefined"
    :hide-body="!error && !requireTypedConfirmation"
  >
    <template #header>
      <div class="confirm-heading">
        <span class="confirm-icon" :class="`confirm-${variant}`" aria-hidden="true">
          <IconAlertTriangle :size="20" stroke-width="1.8" />
        </span>
        <div class="confirm-copy">
          <h2 :id="titleId" class="confirm-title" :class="`confirm-${variant}`">{{ title }}</h2>
          <p v-if="description && !$slots.default" :id="descriptionId" class="confirm-description">
            {{ description }}
          </p>
          <div v-else-if="$slots.default" :id="descriptionId" class="confirm-description">
            <slot />
          </div>
        </div>
      </div>
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
        <UiButton variant="outline" width="auto" :disabled="loading" @click="onCancel">
          {{ cancelLabel }}
        </UiButton>
        <UiButton
          :variant="variant === 'danger' ? 'danger' : 'primary'"
          width="auto"
          :loading="loading"
          :disabled="!canConfirm"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { IconAlertTriangle } from '@tabler/icons-vue';
import UiModal from './UiModal.vue';
import UiButton from './UiButton.vue';
import UiAlert from './UiAlert.vue';
import UiInput from './UiInput.vue';

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

const titleId = `confirm-title-${useId()}`;
const descriptionId = `confirm-description-${useId()}`;
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
.confirm-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.confirm-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  color: var(--text-muted);
}

.confirm-icon.confirm-danger {
  border-color: var(--color-danger-border);
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.confirm-icon.confirm-primary {
  border-color: var(--color-info-border);
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.confirm-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.confirm-title {
  font-size: var(--text-xl);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.confirm-title.confirm-danger {
  color: var(--text-main);
}

.confirm-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  width: 100%;
}

.typed-confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.typed-confirm-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.typed-confirm-code {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-main);
  background-color: var(--bg-hover);
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
}

@media (max-width: 640px) {
  .confirm-footer {
    flex-direction: column-reverse;
  }

  .confirm-footer :deep(.ui-button) {
    width: 100%;
  }
}
</style>
