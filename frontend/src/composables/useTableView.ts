import { computed, ref, watch } from 'vue';
import {
  functionalUpdate,
  type ColumnVisibilityState,
  type RowData,
} from '@tanstack/vue-table';
import {
  useAppTable,
  useSortingState,
  useControlledSorting,
  sortingStateToServer,
  serverToSortingState,
  type AppColumnDef,
} from '@/composables/useAppTable';
import type { ServerSort } from '@/composables/useAppTable';
import { STORAGE_KEYS } from '@/utils/storage-keys';

export interface TableViewOptions {
  initialSort?: ServerSort;
  /** Id estable de la tabla para persistir columnas visibles (ej. `members`). */
  columnVisibilityKey?: string;
}

/**
 * Store mínimo que useTableView necesita para conectar sort y datos.
 *
 * Cualquier store generado por usePaginatedSetup lo cumple automáticamente.
 * También funciona con stores custom, siempre que exporten estos tres campos.
 */
export interface TableViewStore<T> {
  /** Array reactivo de items (el Ref ya desenvuelto por Pinia). */
  items: T[];
  /** Estado de carga — controla el skeleton inicial. */
  isLoading: boolean;
  /** Callback que el store usa para aplicar sort server-side. */
  setSort: (sort: ServerSort) => Promise<void>;
}

function readColumnVisibility(key?: string): ColumnVisibilityState {
  if (!key) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tableColumns(key));
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'),
    ) as ColumnVisibilityState;
  } catch {
    return {};
  }
}

/**
 * Id con el que TanStack registra la columna: el `id` explícito si existe y,
 * si no, el `accessorKey` (las columnas de accessor function ya traen `id`).
 */
function columnKey(column: AppColumnDef<any>): string | undefined {
  const def = column as { id?: string; accessorKey?: string };
  if (def.id) return def.id;
  return typeof def.accessorKey === 'string' ? def.accessorKey : undefined;
}

function normalizeVisibility<T extends RowData>(
  columns: AppColumnDef<T>[],
  stored: ColumnVisibilityState,
): ColumnVisibilityState {
  if (Object.keys(stored).length === 0) return stored;

  const hideableIds = columns
    .map(columnKey)
    .filter((id): id is string => Boolean(id) && id !== 'actions');

  if (hideableIds.length === 0) return stored;
  if (hideableIds.some((id) => stored[id] !== false)) return stored;

  return {
    ...stored,
    ...Object.fromEntries(hideableIds.map((id) => [id, true])),
  };
}

function persistColumnVisibility(key: string, state: ColumnVisibilityState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.tableColumns(key), JSON.stringify(state));
  } catch {
    // Almacenamiento lleno o bloqueado: la tabla sigue funcionando sin persistir.
  }
}

/**
 * Composable que unifica el boilerplate de tablas paginadas server-side.
 *
 * Reemplaza el bloque de ~14 líneas que se repetía en MembersView y
 * BranchesView (y que aparecerá en cada CRUD futuro):
 *
 * ```ts
 * // Antes — 14 líneas en cada vista:
 * const sorting = useSortingState();
 * const table = useAppTable<Member>({
 *   columns: useMemberColumns(),
 *   data: computed(() => memberStore.members),
 *   manualSorting: true,
 *   manualPagination: true,
 *   autoResetPageIndex: false,
 *   ...useControlledSorting(sorting, (s) => memberStore.setSort(sortingStateToServer(s)).catch(() => {})),
 * });
 * const isInitialLoading = computed(() => memberStore.isLoading && memberStore.members.length === 0);
 *
 * // Ahora — 1 línea:
 * const { table, isInitialLoading } = useTableView(useMemberColumns(), memberStore);
 * ```
 *
 * Los filtros siguen siendo responsabilidad de la view (vía useFilterSync)
 * para que cada módulo controle qué filtros muestra y cómo los mapea al store.
 *
 * @param columns - Definiciones de columna creadas con `createAppColumnHelper`
 * @param store   - Store con `items`, `isLoading` y `setSort`
 * @param options - `initialSort` y `columnVisibilityKey` (persistencia local)
 *
 * @returns `table` — instancia de TanStack Vue Table lista para pasar a UiDataTable o a un feature table component
 * @returns `isInitialLoading` — `true` solo en la primera carga (sin datos previos); false en re-fetches con datos
 * @returns `visibleColumnIds` — ids de las columnas visibles (sin `actions`), para exportar lo que el usuario ve
 */
export function useTableView<T extends RowData>(
  columns: AppColumnDef<T>[],
  store: TableViewStore<T>,
  options: TableViewOptions = {},
) {
  const sorting = useSortingState(serverToSortingState(options.initialSort ?? {}));

  const columnVisibility = ref<ColumnVisibilityState>(
    normalizeVisibility(columns, readColumnVisibility(options.columnVisibilityKey)),
  );

  const controlledSorting = useControlledSorting(sorting, (s) => {
    store.setSort(sortingStateToServer(s)).catch(() => {});
  });

  const table = useAppTable<T>({
    columns,
    // computed es obligatorio: TanStack solo reacciona a refs/computed.
    // Si se pasara el array pelado (store.items directamente), la tabla
    // quedaría congelada con los datos del mount.
    data: computed(() => store.items),
    manualSorting: true,
    manualPagination: true,
    autoResetPageIndex: false,
    ...controlledSorting,
    state: computed(() => ({
      ...controlledSorting.state.value,
      columnVisibility: columnVisibility.value,
    })),
    onColumnVisibilityChange: (updater) => {
      columnVisibility.value = functionalUpdate(updater, columnVisibility.value);
    },
  });

  if (options.columnVisibilityKey) {
    const key = options.columnVisibilityKey;
    watch(columnVisibility, (state) => persistColumnVisibility(key, state), {
      deep: true,
    });
  }

  /**
   * `true` solo en la carga inicial (tabla vacía + loading).
   * `false` en re-fetches con datos previos: así no se muestra el skeleton
   * cuando el usuario cambia de página o aplica un filtro.
   */
  const isInitialLoading = computed(
    () => store.isLoading && store.items.length === 0,
  );

  const visibleColumnIds = computed(() =>
    table
      .getVisibleLeafColumns()
      .map((column) => column.id)
      .filter((id) => id !== 'actions'),
  );

  return { table, isInitialLoading, visibleColumnIds };
}
