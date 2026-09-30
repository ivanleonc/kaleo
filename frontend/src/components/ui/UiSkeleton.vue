<template>
  <div
    class="skeleton ui-skeleton"
    :class="`ui-skeleton--${variant}`"
    :style="style"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

type SkeletonVariant = 'text' | 'title' | 'avatar' | 'badge' | 'block';

const props = withDefaults(
  defineProps<{
    variant?: SkeletonVariant;
    width?: string;
    height?: string;
    radius?: string;
  }>(),
  { variant: 'text' },
);

const style = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {};
  const v = props.variant;

  if (props.width) s.width = props.width;
  else if (v === 'text' || v === 'title' || v === 'block') s.width = '100%';
  else if (v === 'avatar') s.width = '32px';
  else if (v === 'badge') s.width = '70px';

  if (props.height) s.height = props.height;
  else if (v === 'text') s.height = '14px';
  else if (v === 'title') s.height = '22px';
  else if (v === 'avatar') s.height = '32px';
  else if (v === 'badge') s.height = '20px';

  if (props.radius) s.borderRadius = props.radius;
  else if (v === 'avatar') s.borderRadius = '50%';
  else if (v === 'badge') s.borderRadius = 'var(--radius-full)';

  return s;
});
</script>

<style scoped>
.ui-skeleton {
  display: block;
  flex-shrink: 0;
}

.ui-skeleton--block {
  min-height: 1rem;
}
</style>
