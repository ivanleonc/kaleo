<template>
  <label class="ui-switch" :class="{ 'is-disabled': disabled }">
    <span class="switch-copy">
      <span v-if="label" class="switch-label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="switch-description">
        {{ description }}
      </span>
    </span>
    <span class="switch-control">
      <input
        v-model="model"
        type="checkbox"
        role="switch"
        class="switch-input"
        :disabled="disabled"
        :aria-checked="model"
        :aria-describedby="description ? descriptionId : undefined"
      />
      <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb"></span>
      </span>
    </span>
  </label>
</template>

<script setup lang="ts">
import { useId } from 'vue';

withDefaults(defineProps<{
  label?: string;
  description?: string;
  disabled?: boolean;
}>(), {
  label: '',
  description: '',
  disabled: false,
});

const model = defineModel<boolean>({ default: false });

const descriptionId = `ui-switch-description-${useId()}`;
</script>

<style scoped>
.ui-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  min-height: 2.75rem;
  cursor: pointer;
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.switch-label {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-main);
}

.switch-description {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.switch-control {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.375rem;
}

.switch-input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch-track {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  transition: background-color 0.18s, border-color 0.18s;
}

.switch-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: var(--radius-full);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, background-color 0.18s;
}

.switch-input:checked + .switch-track {
  border-color: var(--primary);
  background-color: var(--primary);
}

.switch-input:checked + .switch-track .switch-thumb {
  background-color: var(--primary-foreground);
  transform: translateX(1.125rem);
}

.switch-input:focus-visible + .switch-track {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.ui-switch.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ui-switch.is-disabled .switch-input {
  cursor: not-allowed;
}

@media (pointer: coarse) {
  .switch-control {
    width: 2.75rem;
    height: 1.625rem;
  }

  .switch-thumb {
    width: 1.125rem;
    height: 1.125rem;
  }

  .switch-input:checked + .switch-track .switch-thumb {
    transform: translateX(1.25rem);
  }
}
</style>
