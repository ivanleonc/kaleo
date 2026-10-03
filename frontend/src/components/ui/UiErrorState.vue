<template>
  <div class="empty-state ui-error-state" role="alert">
    <slot name="icon">
      <IconAlertTriangle class="ui-error-state__icon" :size="40" stroke-width="1.5" />
    </slot>
    <p>{{ title }}</p>
    <span v-if="description">{{ description }}</span>
    <!--
      Slot #action: permite inyectar acciones personalizadas (ej: "Volver",
      múltiples botones, o un enlace) en lugar del botón de reintentar fijo.
      Cuando se provee el slot, el botón de reintentar se oculta para evitar
      duplicados. Mantiene simetría con UiEmptyState, que ya tiene este slot.
    -->
    <slot name="action">
      <UiButton
        v-if="retryable"
        variant="outline"
        size="sm"
        width="auto"
        :loading="loading"
        @click="emit('retry')"
      >
        {{ retryLabel }}
      </UiButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import { IconAlertTriangle } from '@tabler/icons-vue';
import UiButton from '@/components/ui/UiButton.vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    retryLabel?: string;
    loading?: boolean;
  }>(),
  {
    title: 'No se pudieron cargar los datos',
    description: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    retryLabel: 'Reintentar',
    loading: false,
  },
);

const emit = defineEmits<{ retry: [] }>();

// Los listeners de un emit declarado no llegan a $attrs, así que se mira el vnode.
const instance = getCurrentInstance();
const retryable = computed(() => Boolean((instance?.vnode.props as Record<string, unknown>)?.onRetry));
</script>

<style scoped>
.ui-error-state__icon {
  color: var(--color-danger);
}
</style>
