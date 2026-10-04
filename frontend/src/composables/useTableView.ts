import { computed } from 'vue';
import {
  useAppTable,
  useSortingState,
  useControlledSorting,
  sortingStateToServer,
  type AppColumnDef,
} from '@/composables/useAppTable';
import type { RowData } from '@tanstack/vue-table';
import type { ServerSort } from '@/composables/useAppTable';

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
 *
 * @returns `table` — instancia de TanStack Vue Table lista para pasar a UiDataTable o a un feature table component
 * @returns `isInitialLoading` — `true` solo en la primera carga (sin datos previos); false en re-fetches con datos
 */
export function useTableView<T extends RowData>(
  columns: AppColumnDef<T>[],
  store: TableViewStore<T>,
) {
  const sorting = useSortingState();

  const table = useAppTable<T>({
    columns,
    // computed es obligatorio: TanStack solo reacciona a refs/computed.
    // Si se pasara el array pelado (store.items directamente), la tabla
    // quedaría congelada con los datos del mount.
    data: computed(() => store.items),
    manualSorting: true,
    manualPagination: true,
    autoResetPageIndex: false,
    ...useControlledSorting(sorting, (s) => {
      store.setSort(sortingStateToServer(s)).catch(() => {});
    }),
  });

  /**
   * `true` solo en la carga inicial (tabla vacía + loading).
   * `false` en re-fetches con datos previos: así no se muestra el skeleton
   * cuando el usuario cambia de página o aplica un filtro.
   */
  const isInitialLoading = computed(
    () => store.isLoading && store.items.length === 0,
  );

  return { table, isInitialLoading };
}
