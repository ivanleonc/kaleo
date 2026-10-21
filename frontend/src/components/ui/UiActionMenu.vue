<template>
  <UiDropdown :align="align" :label="label">
    <template #trigger="{ toggle, triggerAria }">
      <slot
        name="trigger"
        :toggle="toggle"
        :trigger-aria="triggerAria"
      >
        <button
          type="button"
          :class="['ui-action-menu-trigger', `is-${size}`]"
          :aria-label="triggerLabel || label"
          v-bind="triggerAria"
          @click.stop="toggle"
        >
          <IconDotsVertical :size="size === 'md' ? 18 : 16" stroke-width="1.8" />
        </button>
      </slot>
    </template>
    <slot />
  </UiDropdown>
</template>

<script setup lang="ts">
import { IconDotsVertical } from '@tabler/icons-vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';

withDefaults(defineProps<{
  label: string;
  triggerLabel?: string;
  align?: 'start' | 'end';
  size?: 'sm' | 'md';
}>(), {
  triggerLabel: '',
  align: 'end',
  size: 'sm',
});
</script>

<style scoped>
.ui-action-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.ui-action-menu-trigger.is-md {
  width: 36px;
  height: 36px;
}

.ui-action-menu-trigger:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.ui-action-menu-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (pointer: coarse) {
  .ui-action-menu-trigger {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
