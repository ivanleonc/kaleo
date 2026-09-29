<template>
  <div v-if="hasPrev || canGoNext" class="pagination">
    <button type="button" class="page-btn" :disabled="!hasPrev || loading" @click="$emit('prev')">
      Anterior
    </button>
    <span class="page-info">
      {{ info }}
    </span>
    <button type="button" class="page-btn" :disabled="!canGoNext || loading" @click="$emit('next')">
      Siguiente
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Navegación para paginación por cursor.
 *
 * `UiPagination` necesita un `total` para dibujar números de página, y obtenerlo
 * es justo el `COUNT(*)` que la paginación por cursor evita. Aquí solo se puede
 * avanzar y retroceder, y la posición se expresa de forma aproximada.
 */
const props = withDefaults(
  defineProps<{
    hasPrev?: boolean;
    canGoNext?: boolean;
    loading?: boolean;
    pageIndex?: number;
    count?: number;
    totalLabel?: string;
  }>(),
  {
    hasPrev: false,
    canGoNext: false,
    loading: false,
    pageIndex: 0,
    count: 0,
    totalLabel: 'registros',
  },
);

defineEmits<{ (e: 'next'): void; (e: 'prev'): void }>();

const info = computed(() => {
  const suffix = props.count === 1 ? props.totalLabel.replace(/s$/, '') : props.totalLabel;
  return `Página ${props.pageIndex + 1} · ${props.count} ${suffix}`;
});
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

.page-btn {
  height: 2rem;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) {
  background: var(--text-main);
  color: var(--bg-card);
  border-color: var(--text-main);
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@media (pointer: coarse) {
  .page-btn {
    min-height: 44px;
  }
}
</style>
