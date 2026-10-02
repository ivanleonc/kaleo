<template>
<div class="empty-state" role="status">
    <slot name="icon">
      <IconInbox :size="48" stroke-width="1.5" />
    </slot>
    <p>{{ title }}</p>
    <span v-if="description">{{ description }}</span>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
import { IconInbox } from '@tabler/icons-vue';

defineProps<{
  title: string;
  description?: string;
}>();
</script>
