<template>
  <div class="table-wrapper" :class="{ 'table-scroll': sticky }">
    <!--
      Sin esto, un refetch fallido con filas viejas es invisible: el estado
      de error completo solo se muestra cuando no hay filas que enseñar.
    -->
    <UiAlert v-if="error && visibleRows.length > 0" type="warning" class="ui-table-error-banner">
      <span class="ui-table-error-text">{{ error }}</span>
      <button
        v-if="hasRetryListener"
        type="button"
        class="ui-table-error-retry"
        @click="emit('retry')"
      >
        Reintentar
      </button>
    </UiAlert>
    <table
      v-if="!loading && visibleRows.length > 0"
      class="ui-table"
      :class="{ 'is-sticky': sticky }"
    >
      <thead>
        <tr v-for="headerGroup in headerGroups" :key="headerGroup.id">
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            scope="col"
            :colspan="header.colSpan"
            :style="alignStyle(header.column.columnDef.meta?.align)"
            :aria-sort="ariaSortFor(header.column)"
          >
            <template v-if="!header.isPlaceholder">
              <button
                v-if="header.column.getCanSort()"
                type="button"
                class="ui-table-sort"
                :class="{ 'is-active': header.column.getIsSorted() !== false }"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <span>{{ headerLabel(header) }}</span>
                <IconArrowsSort
                  v-if="header.column.getIsSorted() === false"
                  :size="14"
                  class="sort-icon"
                  aria-hidden="true"
                />
                <IconArrowUp
                  v-else-if="header.column.getIsSorted() === 'asc'"
                  :size="14"
                  class="sort-icon"
                  aria-hidden="true"
                />
                <IconArrowDown
                  v-else
                  :size="14"
                  class="sort-icon"
                  aria-hidden="true"
                />
              </button>
              <template v-else>{{ headerLabel(header) }}</template>
            </template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in visibleRows" :key="row.id">
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :data-label="cell.column.columnDef.meta?.label ?? ''"
            :style="alignStyle(cell.column.columnDef.meta?.align)"
          >
            <!--
              API de celdas custom preservada: el slot se nombra por el `id`
              de la columna (`cell-name`, `cell-actions`...), igual que antes.
            -->
            <slot
              :name="`cell-${cell.column.id}`"
              :row="cell.row.original"
              :index="row.index"
              :cell="cell"
              :value="cell.getValue()"
            >
              {{ defaultCellText(cell) }}
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
          v-for="header in leafHeaders"
          :key="header.id"
          class="skeleton skeleton-text"
          :style="{ width: `${columnSkeletonWidth(header.column.id, headerLabel(header))}px` }"
        ></div>
      </div>
    </div>

    <UiErrorState
      v-else-if="error && visibleRows.length === 0"
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

<script setup lang="ts" generic="TData extends RowData">
import { computed, getCurrentInstance } from 'vue';
import {
  IconArrowsSort,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-vue';
import type {
  AppVueTable,
  Cell,
  Column,
  Header,
  RowData,
} from '@tanstack/vue-table';
import type { AppFeatures } from '@/composables/useAppTable';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const props = withDefaults(defineProps<{
  /** Instancia creada con `useAppTable`. El presentador solo renderiza. */
  table: AppVueTable<AppFeatures, TData, {}, {}, {}>;
  loading?: boolean;
  skeletonRows?: number;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Cabecera fija con scroll interno (útil en tablas largas dentro del layout). */
  sticky?: boolean;
}>(), {
  loading: false,
  skeletonRows: 5,
  error: null,
  errorTitle: 'No se pudieron cargar los datos',
  emptyTitle: 'Sin resultados',
  emptyDescription: '',
  sticky: false,
});

const emit = defineEmits<{
  retry: [];
}>();

// Los listeners de un emit declarado no llegan a $attrs, así que se mira el vnode.
const instance = getCurrentInstance();
const hasRetryListener = computed(
  () => !!(instance?.vnode.props as Record<string, unknown> | null)?.onRetry,
);
const retryAttrs = computed(() =>
  hasRetryListener.value ? { onRetry: () => emit('retry') } : {},
);

const headerGroups = computed(() => props.table.getHeaderGroups());
const visibleRows = computed(() => props.table.getRowModel().rows);
const leafHeaders = computed(() => headerGroups.value.flatMap((g) => g.headers));

const alignStyle = (align?: 'left' | 'center' | 'right') =>
  align ? { textAlign: align } : undefined;

const headerLabel = (header: Header<AppFeatures, TData, any>): string => {
  const def = header.column.columnDef.header;
  if (typeof def === 'string' || typeof def === 'number') return String(def);
  return header.column.id;
};

const ariaSortFor = (
  column: Column<AppFeatures, TData, any>,
): 'ascending' | 'descending' | 'none' | undefined => {
  if (!column.getCanSort()) return undefined;
  const sorted = column.getIsSorted();
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
};

const defaultCellText = (cell: Cell<AppFeatures, TData, any>): string => {
  const value: unknown = cell.getValue();
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const columnSkeletonWidth = (id: string, label: string): number => {
  if (!id || id === 'actions') return 32;
  const labelLength = label?.length || 0;
  return 120 + ((labelLength * 13) % 90);
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

/* Aviso no bloqueante: el refetch falló pero se siguen viendo filas viejas. */
.ui-table-error-banner {
  margin-bottom: var(--space-3);
}

.ui-table-error-banner.ui-alert .alert-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
}

.ui-table-error-text {
  flex: 1;
  min-width: 0;
}

.ui-table-error-retry {
  flex-shrink: 0;
  background: none;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: inherit;
  cursor: pointer;
}

.ui-table-error-retry:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.ui-table-error-retry:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
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
