<template>
  <ol class="ui-steps" :style="{ '--step-count': steps.length }" :aria-label="label">
    <li
      v-for="step in steps"
      :key="step.number"
      class="ui-step"
      :class="stepState(step.number)"
      :aria-current="step.number === current ? 'step' : undefined"
    >
      <span class="ui-step-number">
        <IconCheck v-if="stepState(step.number) === 'is-done'" :size="14" stroke-width="2.2" />
        <template v-else>{{ step.number }}</template>
      </span>
      <span class="ui-step-label">{{ step.label }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { IconCheck } from '@tabler/icons-vue';

export interface StepItem {
  number: number;
  label: string;
}

const props = withDefaults(defineProps<{
  steps: readonly StepItem[];
  current: number;
  complete?: boolean;
  errorAt?: number | null;
  label?: string;
}>(), {
  complete: false,
  errorAt: null,
  label: 'Pasos',
});

function stepState(step: number): string {
  if (props.complete) return 'is-done';
  if (props.errorAt === step) return 'is-error';
  if (step < props.current) return 'is-done';
  if (step === props.current) return 'is-current';
  return 'is-pending';
}
</script>

<style scoped>
.ui-steps {
  display: grid;
  grid-template-columns: repeat(var(--step-count), minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ui-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ui-step-number {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.ui-step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-step.is-current {
  border-color: var(--primary);
  background-color: var(--color-primary-light);
  color: var(--text-main);
  font-weight: 600;
}

.ui-step.is-current .ui-step-number {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.ui-step.is-done {
  border-color: var(--color-success-border);
  color: var(--color-success-text);
}

.ui-step.is-done .ui-step-number {
  background-color: var(--color-success);
  color: #fff;
}

.ui-step.is-error {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.ui-step.is-error .ui-step-number {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

@media (max-width: 640px) {
  .ui-steps {
    grid-template-columns: 1fr;
  }
}
</style>
