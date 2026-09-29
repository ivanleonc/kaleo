<template>
  <span
    class="ui-badge"
    :class="[`ui-badge--${variant}`, size !== 'md' ? `ui-badge--${size}` : '']"
  >
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import type { BadgeVariant } from '@/types/ui';

/**
 * Badge unificado. Reemplaza a los ~10 sistemas de badge dispersos entre
 * vistas (`.badge-status`, `.role-badge`, `.action-badge`, `.status-badge`,
 * `.badge-temp`, ...) que each uno definían su propia paleta.
 */
withDefaults(
  defineProps<{
    label?: string;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
  }>(),
  { label: '', variant: 'neutral', size: 'md' },
);
</script>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
}

.ui-badge--sm {
  font-size: 0.625rem;
  padding: 2px 6px;
}

.ui-badge--success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.ui-badge--warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
}

.ui-badge--danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border-color: var(--color-danger-border);
}

.ui-badge--info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
  border-color: var(--color-info-border);
}

.ui-badge--neutral {
  background-color: var(--bg-hover);
  color: var(--text-muted);
  border-color: var(--border);
}
</style>
