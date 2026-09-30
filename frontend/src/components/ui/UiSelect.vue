<template>
  <div class="ui-select-wrapper">
    <label v-if="label" :for="id" class="ui-label">
      {{ label }} <span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </label>

    <div class="ui-select-control">
        <select
          :id="id"
          v-model="model"
          class="ui-select"
          :class="{ 'has-error': !!error }"
          :required="required"
          :disabled="disabled"
          :aria-label="ariaLabel"
          :aria-invalid="!!error"
          :aria-describedby="error ? errorId : undefined"
        >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <IconSelector class="ui-select-chevron" :size="16" stroke-width="2" aria-hidden="true" />
    </div>
    <UiFieldError :message="error" :id="errorId" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { IconSelector } from '@tabler/icons-vue';
import UiFieldError from '@/components/ui/UiFieldError.vue';

interface Props {
  label?: string;
  placeholder?: string;
  options: { label: string; value: string | number }[];
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  /** Nombre accesible cuando no hay <label> visible (barras de filtros). */
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: '',
  required: false,
  disabled: false,
  error: null,
});

const model = defineModel<string | number>({ default: '' });

const id = useId();
const errorId = `${id}-error`;
</script>

<style scoped>
.ui-select-wrapper { display: flex; flex-direction: column; gap: var(--space-1); width: 100%; }
.ui-label { font-size: var(--text-base); font-weight: 500; color: var(--text-main); }
.required-mark { color: var(--color-danger); }
.ui-select-control { position: relative; width: 100%; }

.ui-select {
  width: 100%;
  height: 2.5rem;
  padding: 0 var(--space-8) 0 var(--space-3);
  font-size: var(--text-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  color: var(--text-main);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  appearance: none;
  cursor: pointer;
}

.ui-select-chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.ui-select:focus {
  border-color: var(--text-main);
  box-shadow: 0 0 0 1px var(--text-main);
}

.ui-select.has-error {
  border-color: var(--color-danger);
}
.ui-select.has-error:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-select:disabled {
  background-color: var(--bg-hover);
  cursor: not-allowed;
  opacity: 0.5;
}

/* 16px en táctil: evita el zoom automático de iOS al enfocar */
@media (pointer: coarse) {
  .ui-select {
    font-size: 1rem;
    min-height: 2.75rem;
  }
}
</style>
