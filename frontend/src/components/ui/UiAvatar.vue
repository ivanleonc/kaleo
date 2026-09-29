<template>
  <div class="ui-avatar" :class="`ui-avatar--${size}`" :style="avatarStyle">
    <img
      v-if="src"
      :src="src"
      :alt="name ?? ''"
      :loading="loading"
      decoding="async"
      @error="onImageError"
    />
    <span v-else class="ui-avatar__initials">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getInitials } from '@/utils/text';

/**
 * Avatar con fallback de iniciales y lazy-loading por defecto.
 *
 * Centraliza 4 usos de `<img>` y 3 definiciones CSS duplicadas de
 * `.user-avatar`. Los avatares de tabla se cargan perezosamente (una página
 * de 20 miembros disparaba 20 requests); los de cabecera se fuerzan a eager.
 */
const props = withDefaults(
  defineProps<{
    src?: string | null;
    name?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    loading?: 'lazy' | 'eager';
    background?: string;
  }>(),
  { src: null, name: null, size: 'md', loading: 'lazy', background: undefined },
);

const SIZES: Record<string, string> = {
  xs: '1.5rem',
  sm: '2rem',
  md: '2.5rem',
  lg: '4rem',
  xl: '6rem',
};

const failed = ref(false);
const initials = computed(() => getInitials(props.name));
const avatarStyle = computed(() => ({
  width: SIZES[props.size],
  height: SIZES[props.size],
  fontSize: props.size === 'xs' || props.size === 'sm' ? '0.7rem' : '0.85rem',
  ...(props.background ? { backgroundColor: props.background } : {}),
}));

function onImageError() {
  failed.value = true;
}

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>

<style scoped>
.ui-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  color: var(--text-muted);
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.ui-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
