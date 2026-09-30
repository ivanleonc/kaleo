import { computed, ref, type Ref } from 'vue';
import {
  createTableHook,
  tableFeatures,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  columnPinningFeature,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  sortFn_basic,
  sortFn_alphanumeric,
  sortFn_text,
  sortFn_datetime,
  filterFn_includesString,
  filterFn_equalsString,
  functionalUpdate,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
} from '@tanstack/vue-table';

/**
 * Feature set canónico de la app: TODAS las tablas usan este mismo objeto.
 * Registrar de más no cuesta (tree-shake + row models que no se usan no
 * corren); registrar de menos rompería el tipado de la instancia.
 * `columnMeta` declara el meta propio sin `declare module` global.
 */
export const appFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  globalFilteringFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
  columnPinningFeature,
  sortFns: {
    basic: sortFn_basic,
    alphanumeric: sortFn_alphanumeric,
    // `text` lo pide el auto-sort de strings; sin él cae a `basic` con warning.
    text: sortFn_text,
    datetime: sortFn_datetime,
  },
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
  },
  // Meta propio del design system: etiqueta para las tarjetas móvil
  // (data-label) y alineación de la columna.
  columnMeta: {} as {
    label?: string;
    align?: 'left' | 'center' | 'right';
  },
});

export type AppFeatures = typeof appFeatures;

/**
 * Tipo para los arrays de columnas de las vistas. `TValue` va en `any`
 * porque `ColumnDef` es invariante en ese parámetro y cada accessor
 * devuelve algo distinto (string, number, boolean...).
 */
export type AppColumnDef<TData extends RowData> = ColumnDef<AppFeatures, TData, any>;

/**
 * Hook con las convenciones de la app pre-atadas:
 * - Un clic alterna asc ↔ desc (sin tercer estado "sin orden").
 * - Sin multi-sort: una sola columna a la vez, como el UiDataTable anterior.
 * - `getRowId` por defecto usa `row.id` (todas las entidades lo tienen).
 */
export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: appFeatures,
  enableSortingRemoval: false,
  enableMultiSort: false,
  getRowId: (row: any) => String(row?.id ?? ''),
});

/** Sort en el idioma del backend (`sortBy`/`sortDir` del SortQueryDto). */
export interface ServerSort {
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** TanStack `[{ id, desc }]` → `{ sortBy, sortDir }` para el query string. */
export function sortingStateToServer(sorting: SortingState): ServerSort {
  const [first] = sorting;
  if (!first) return {};
  return { sortBy: first.id, sortDir: first.desc ? 'desc' : 'asc' };
}

/** `{ sortBy, sortDir }` del store → estado TanStack. */
export function serverToSortingState(sort: ServerSort): SortingState {
  return sort.sortBy ? [{ id: sort.sortBy, desc: sort.sortDir === 'desc' }] : [];
}

/**
 * Conecta un slice de sorting controlado por Vue con la tabla y notifica
 * cambios (p. ej. para refetchear en modo servidor). Devuelve las dos
 * opciones que hay que pasarle a `useAppTable`.
 *
 * OJO: `state` va como `computed`, no como objeto plano con refs dentro —
 * el adapter v9 solo desenvuelve el nivel superior y si no el átomo recibe
 * el Ref en vez del array.
 */
export function useControlledSorting(
  sorting: Ref<SortingState>,
  onChange?: (sorting: SortingState) => void,
) {
  return {
    state: computed(() => ({ sorting: sorting.value })),
    onSortingChange: (updater: Updater<SortingState>) => {
      sorting.value = functionalUpdate(updater, sorting.value);
      onChange?.(sorting.value);
    },
  };
}

/** Estado de sorting local reactivo, listo para `useControlledSorting`. */
export function useSortingState(initial: SortingState = []) {
  return ref<SortingState>(initial);
}
