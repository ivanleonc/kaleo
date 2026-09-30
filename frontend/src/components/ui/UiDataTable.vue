<template>
  <div class="table-wrapper" :class="{ 'table-scroll': sticky }">
    <table
      v-if="!loading && rows.length > 0"
      class="ui-table"
      :class="{ 'is-sticky': sticky, 'is-sortable': hasSortableColumn }"
    >
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :style="col.align ? { textAlign: col.align } : undefined"
            :aria-sort="ariaSortFor(col.key)"
          >
            <button
              v-if="sortable && col.sortable"
              type="button"
              class="ui-table-sort"
              :class="{ 'is-active': sortKey === col.key }"
              @click="toggleSort(col.key)"
            >
              <span>{{ col.label }}</span>
              <IconArrowsSort
                v-if="sortKey !== col.key"
                :size="14"
                class="sort-icon"
                aria-hidden="true"
              />
              <IconArrowUp v-else-if="sortDir === 'asc'" :size="14" class="sort-icon" aria-hidden="true" />
              <IconArrowDown v-else :size="14" class="sort-icon" aria-hidden="true" />
            </button>
            <template v-else>{{ col.label }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in sortedRows" :key="rowKey(row, i)">
          <td
            v-for="col in columns"
            :key="col.key"
            :data-label="col.label"
            :style="col.align ? { textAlign: col.align } : undefined"
          >
            <slot :name="`cell-${col.key}`" :row="row" :index="i">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-else-if="loading"
      class="skeleton-list"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">Cargando datos…</span>
      <div v-for="n in skeletonRows" :key="n" class="skeleton-row" aria-hidden="true">
        <div
          v-for="(col, c) in columns"
          :key="c"
          class="skeleton skeleton-text"
          :style="{ width: `${columnSkeletonWidth(col)}px` }"
        ></div>
      </div>
    </div>

    <UiErrorState
      v-else-if="error && rows.length === 0"
      :title="errorTitle"
      :description="error"
      v-bind="retryAttrs"
    />

    <slot v-else name="empty">
      <UiEmptyState :title="emptyTitle" :description="emptyDescription">
        <template v-if="$slots['empty-icon']" #icon>
          <slot name="empty-icon" />
        </template>
        <template v-if="$slots['empty-action']" #action>
          <slot name="empty-action" />
        </template>
      </UiEmptyState>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import { IconArrowsSort, IconArrowUp, IconArrowDown } from '@tabler/icons-vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';

export type SortDir = 'asc' | 'desc';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /** Permite ordenar por esta columna. Requiere `sortable` en la tabla. */
  sortable?: boolean;
  /** Valor a ordenar cuando la celda no es texto plano (fechas, números). */
  sortAccessor?: (row: any) => string | number;
}

const props = withDefaults(defineProps<{
  columns: TableColumn[];
  rows: any[];
  loading?: boolean;
  skeletonRows?: number;
  rowKey?: string | ((row: any, index: number) => string | number);
  emptyTitle?: string;
  emptyDescription?: string;
  error?: string | null;
  errorTitle?: string;
  /** Cabecera fija con scroll interno (útil en tablas largas dentro del layout). */
  sticky?: boolean;
  /** Habilita el ordenamiento local por columna. */
  sortable?: boolean;
  sortKey?: string | null;
  sortDir?: SortDir;
}>(), {
  loading: false,
  skeletonRows: 5,
  rowKey: 'id',
  emptyTitle: 'Sin resultados',
  emptyDescription: '',
  error: null,
  errorTitle: 'No se pudieron cargar los datos',
  sticky: false,
  sortable: false,
  sortKey: null,
  sortDir: 'asc',
});

const emit = defineEmits<{
  retry: [];
  'update:sortKey': [key: string];
  'update:sortDir': [dir: SortDir];
}>();

// Los listeners de un emit declarado no llegan a $attrs, así que se mira el vnode.
const instance = getCurrentInstance();
const retryAttrs = computed(() => {
  const onRetry = (instance?.vnode.props as Record<string, unknown> | null)?.onRetry;
  return onRetry ? { onRetry: () => emit('retry') } : {};
});

const rowKey = (row: any, index: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index);
  return row[props.rowKey as string] ?? index;
};

const columnSkeletonWidth = (col: TableColumn): number => {
  if (!col || col.key === 'actions') return 32;
  const labelLength = col.label?.length || 0;
  return 120 + ((labelLength * 13) % 90);
};

const hasSortableColumn = computed(() => props.sortable && props.columns.some((c) => c.sortable));

const columnByKey = (key: string) => props.columns.find((c) => c.key === key);

const cellValue = (row: any, col: TableColumn): string | number => {
  if (col.sortAccessor) return col.sortAccessor(row);
  const raw = row[col.key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') return raw;
  // Los booleanos se comparan como texto ("true"/"false") de forma estable.
  return String(raw);
};

const sortedRows = computed(() => {
  if (!props.sortable || !props.sortKey) return props.rows;
  const col = columnByKey(props.sortKey);
  if (!col) return props.rows;

  const factor = props.sortDir === 'asc' ? 1 : -1;
  // Copia: nunca mutar la lista que entrega la vista/store.
  return [...props.rows].sort((a, b) => {
    const av = cellValue(a, col);
    const bv = cellValue(b, col);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv), 'es', { sensitivity: 'base', numeric: true }) * factor;
  });
});

const toggleSort = (key: string) => {
  if (props.sortKey === key) {
    const next: SortDir = props.sortDir === 'asc' ? 'desc' : 'asc';
    emit('update:sortDir', next);
    return;
  }
  emit('update:sortKey', key);
  emit('update:sortDir', 'asc');
};

const ariaSortFor = (key: string) => {
  if (!props.sortable || !hasSortableColumn.value) return undefined;
  if (key !== props.sortKey) return 'none' as const;
  return props.sortDir === 'asc' ? ('ascending' as const) : ('descending' as const);
};
</script>

<style>
/* Contenedor con scroll interno: es lo que permite anclar la cabecera. */
.table-wrapper.table-scroll {
  max-height: var(--table-scroll-height, 60vh);
  overflow: auto;
}

.ui-table.is-sticky thead th {
  position: sticky;
  top: 0;
  z-index: 2;
}

.ui-table-sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
}

.ui-table-sort:hover {
  color: var(--text-main);
}

.ui-table-sort:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.ui-table-sort .sort-icon {
  opacity: 0.45;
}

.ui-table-sort.is-active .sort-icon {
  opacity: 1;
  color: var(--color-primary);
}

@media (max-width: 640px) {
  /* Cada fila se convierte en una tarjeta: en tablas densas el scroll
     horizontal en móvil es ilegible y esconde columnas. */
  .ui-table,
  .ui-table tbody,
  .ui-table tr,
  .ui-table td {
    display: block;
    width: 100%;
  }

  .ui-table thead {
    display: none;
  }

  .ui-table tr {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: var(--space-3);
    background: var(--bg-card);
    overflow: hidden;
  }

  .ui-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    text-align: left !important;
  }

  .ui-table td:last-child {
    border-bottom: none;
  }

  .ui-table td::before {
    content: attr(data-label);
    flex-shrink: 0;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-muted);
  }

  .ui-table tr:hover td {
    background-color: transparent;
  }
}
</style>

