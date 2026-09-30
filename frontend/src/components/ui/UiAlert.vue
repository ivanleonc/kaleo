<template>
  <div :class="['ui-alert', `ui-alert-${type}`]" role="alert">
    <IconAlertCircle v-if="type === 'error'" class="alert-icon" :size="16" stroke-width="2" />
    <IconCircleCheck v-else-if="type === 'success'" class="alert-icon" :size="16" stroke-width="2" />
    <IconAlertTriangle v-else-if="type === 'warning'" class="alert-icon" :size="16" stroke-width="2" />
    <IconInfoCircle v-else class="alert-icon" :size="16" stroke-width="2" />
    <div class="alert-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-vue';

withDefaults(defineProps<{
  type?: 'error' | 'success' | 'info' | 'warning';
}>(), {
  type: 'error'
});
</script>

<style scoped>
.ui-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  font-size: var(--text-base);
  font-weight: 500;
}

.ui-alert-error {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
  border: 1px solid var(--color-danger-border);
}

.ui-alert-success {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}

.ui-alert-info {
  background-color: var(--bg-hover);
  color: var(--text-main);
  border: 1px solid var(--border);
}

.ui-alert-warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning-text);
  border: 1px solid var(--color-warning-border);
}

.alert-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.alert-content {
  line-height: 1.25;
}
</style>
