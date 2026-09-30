<template>
  <div v-if="totalPages > 1 || showPageSize" class="pagination">
    <div v-if="showPageSize" class="page-size">
      <label class="page-size-label" :for="selectId">Filas por página</label>
      <select
        :id="selectId"
        class="page-size-select"
        :value="limit"
        @change="onLimitChange"
      >
        <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <nav v-if="totalPages > 1" class="page-nav" :aria-label="`Paginación, página ${page} de ${totalPages}`">
      <button
        type="button"
        class="page-btn"
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        <span class="page-btn-label">Anterior</span>
      </button>

      <ul class="page-numbers">
        <li v-for="(entry, i) in pageItems" :key="`${entry}-${i}`">
          <span v-if="entry === '…'" class="page-gap" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="page-number"
            :class="{ active: entry === page }"
            :aria-current="entry === page ? 'page' : undefined"
            :aria-label="`Ir a la página ${entry}`"
            @click="$emit('update:page', entry as number)"
          >
            {{ entry }}
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="page-btn"
        :disabled="page >= totalPages"
        @click="$emit('update:page', page + 1)"
      >
        <span class="page-btn-label">Siguiente</span>
      </button>
    </nav>

    <p v-if="total > 0" class="page-summary" aria-live="polite">
      {{ rangeStart }}–{{ rangeEnd }} de {{ total }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  page?: number;
  total?: number;
  limit?: number;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  /** Máximo de botones numéricos visibles, contando los extremos. */
  windowSize?: number;
}>(), {
  page: 1,
  total: 0,
  limit: 20,
  showPageSize: false,
  pageSizeOptions: () => [10, 20, 50, 100],
  windowSize: 5,
});

const emit = defineEmits<{
  (e: 'update:page', page: number): void;
  (e: 'update:limit', limit: number): void;
}>();

const selectId = 'ui-pagination-page-size';

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));

/**
 * Ventana deslizante: siempre primera y última página, y `windowSize - 2`
 * páginas alrededor de la actual. El resto se resume con elipsis.
 */
const pageItems = computed<(number | '…')[]>(() => {
  const last = totalPages.value;
  const current = Math.min(Math.max(props.page, 1), last);
  const inner = Math.max(1, props.windowSize - 2);

  let start = Math.max(2, current - Math.floor(inner / 2));
  let end = Math.min(last - 1, start + inner - 1);
  start = Math.max(2, Math.min(start, end - inner + 1));

  const items: (number | '…')[] = [1];
  if (start > 2) items.push('…');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < last - 1) items.push('…');
  if (last > 1) items.push(last);
  return items;
});

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1));
const rangeEnd = computed(() => Math.min(props.page * props.limit, props.total));

const onLimitChange = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value);
  if (!Number.isFinite(value) || value === props.limit) return;
  emit('update:limit', value);
  // Cambiar el tamaño de página invalida la actual: se vuelve a la primera
  // para no dejar al usuario en una página vacía.
  emit('update:page', 1);
};
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-4) 0;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 auto;
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

.page-numbers {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.page-number {
  min-width: 2rem;
  height: 2rem;
  padding: 0 var(--space-1);
  font-size: var(--text-sm);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.page-number:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}
.page-number.active {
  background: var(--color-primary);
  color: var(--color-primary-contrast, #fff);
  border-color: var(--color-primary);
  font-weight: 600;
}
.page-number:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.page-gap {
  display: inline-block;
  min-width: 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

.page-size {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.page-size-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  white-space: nowrap;
}

.page-size-select {
  height: 2rem;
  padding: 0 var(--space-2);
  font-size: var(--text-sm);
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
}

.page-summary {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .pagination {
    justify-content: center;
  }

  .page-summary {
    order: 3;
    width: 100%;
    text-align: center;
  }

  .page-btn {
    padding: 0 var(--space-3);
  }
}

@media (pointer: coarse) {
  .page-btn,
  .page-number,
  .page-size-select {
    min-height: 44px;
  }
}
</style>
