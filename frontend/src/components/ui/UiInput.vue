<template>
  <div class="input-group">
    <label v-if="label" :for="id" class="ui-label">{{ label }}</label>
    <div class="input-wrapper">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :name="name"
        :aria-invalid="!!error"
        :aria-describedby="error ? errorId : undefined"
        class="ui-input"
        :class="{ 'has-toggle': type === 'password', 'has-error': !!error }"
      />
      <UiFieldError :message="error" :id="errorId" />
      <button
        v-if="type === 'password'"
        type="button"
        class="password-toggle"
        @click="togglePassword"
        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="showPassword"
        tabindex="0"
      >
        <IconEye v-if="!showPassword" :size="16" stroke-width="1.8" />
        <IconEyeOff v-else :size="16" stroke-width="1.8" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useId } from 'vue';
import { IconEye, IconEyeOff } from '@tabler/icons-vue';
import UiFieldError from '@/components/ui/UiFieldError.vue';

interface Props {
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autocomplete?: string;
  name?: string;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  autocomplete: undefined,
  name: undefined,
  error: null,
});

const model = defineModel<string>({ default: '' });

const id = useId();
const errorId = `${id}-error`;
const showPassword = ref(false);

const inputType = computed(() => {
  if (props.type !== 'password') return props.type;
  return showPassword.value ? 'text' : 'password';
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};
</script>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ui-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1;
}

.input-wrapper {
  position: relative;
}

.ui-input {
  display: flex;
  height: 2.5rem;
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background-color: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--text-main);
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.ui-input.has-toggle {
  padding-right: 2.5rem;
}

.ui-input::placeholder {
  color: var(--text-muted);
}

.ui-input:focus {
  border-color: var(--text-main);
  box-shadow: 0 0 0 1px var(--text-main);
}

.ui-input.has-error {
  border-color: var(--color-danger);
}
.ui-input.has-error:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px var(--color-danger);
}

/* 16px en táctil: evita el zoom automático de iOS al enfocar */
@media (pointer: coarse) {
  .ui-input {
    font-size: 1rem;
    min-height: 2.75rem;
  }
}

.ui-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-app);
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: color 0.15s, background-color 0.15s;
}

.password-toggle:hover {
  color: var(--text-main);
  background-color: var(--bg-hover);
}

/* Objetivo táctil mínimo en Android/iPhone (WCAG 2.5.5: 44×44px) */
@media (pointer: coarse) {
  .password-toggle {
    width: 44px;
    height: 44px;
    right: 0.125rem;
  }
  .ui-input.has-toggle {
    padding-right: 3rem;
  }
}
</style>
