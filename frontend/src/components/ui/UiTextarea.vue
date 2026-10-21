<template>
  <div class="textarea-group">
    <label v-if="label" :for="id" class="ui-label">
      {{ label }} <span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-invalid="!!error"
      :aria-describedby="error ? errorId : undefined"
      class="ui-textarea"
      :class="{ 'has-error': !!error }"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
    ></textarea>
    <UiFieldError :message="error" :id="errorId" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import UiFieldError from '@/components/ui/UiFieldError.vue';

interface Props {
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  maxlength?: number;
  error?: string | null;
}

withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  rows: 3,
  required: false,
  disabled: false,
  maxlength: undefined,
  error: null,
});

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();

const id = useId();
const errorId = `${id}-error`;
</script>

<style scoped>
.textarea-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-label {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-main);
  line-height: 1.25;
}

.required-mark {
  color: var(--color-danger);
}

.ui-textarea {
  display: block;
  width: 100%;
  min-height: 5.5rem;
  padding: var(--space-3);
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: var(--text-base);
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.ui-textarea::placeholder {
  color: var(--text-muted);
}

.ui-textarea:focus {
  border-color: var(--text-main);
  box-shadow: 0 0 0 1px var(--text-main);
}

.ui-textarea.has-error {
  border-color: var(--color-danger);
}

.ui-textarea.has-error:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-app);
}

@media (pointer: coarse) {
  .ui-textarea {
    font-size: 1rem;
  }
}
</style>
