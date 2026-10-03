import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { ServerSort } from '@/composables/useAppTable';

/** Forma que devuelven los servicios del proyecto (respuesta ya desenvuelta de axios). */
export interface PagedServiceResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedStoreConfig<T, F extends Record<string, unknown>> {
  /** ID único del store para Pinia (usado cuando createPaginatedStore genera el store completo). */
  id: string;
  /**
   * Función que llama al API y devuelve la respuesta paginada.
   * Acepta dos formas:
   *  - Respuesta directa del servicio: `PagedServiceResponse<T>`
   *  - Respuesta envuelta por axios: `{ data: PagedServiceResponse<T> }`
   * El factory normaliza ambas automáticamente.
   */
  fetchFn: (params: F & {
    page: number;
    limit: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) => Promise<PagedServiceResponse<T> | { data: PagedServiceResponse<T> }>;
  /** Filtros por defecto */
  defaultFilters: F;
  /** Límite de items por página por defecto */
  defaultLimit?: number;
}

/**
 * Normaliza la respuesta del fetchFn independientemente de si el servicio
 * devuelve la data directa o envuelta en el objeto axios `{ data: ... }`.
 */
function unwrap<T>(
  raw: PagedServiceResponse<T> | { data: PagedServiceResponse<T> },
): PagedServiceResponse<T> {
  if ('success' in raw) return raw as PagedServiceResponse<T>;
  return (raw as { data: PagedServiceResponse<T> }).data;
}

/**
 * Setup function reutilizable que contiene toda la lógica paginada.
 *
 * Se usa dentro de `defineStore` de cada módulo para evitar stores anidados:
 *
 * ```ts
 * export const useMemberStore = defineStore('member', () => {
 *   const paginated = usePaginatedSetup({ fetchFn: ..., defaultFilters: {} });
 *   const create = async (payload) => { ... await paginated.refresh(); };
 *   return { ...paginated, create };
 * });
 * ```
 *
 * El spread `...paginated` funciona correctamente porque todos los valores
 * retornados son `Ref` o funciones — Pinia los desenvuelve en el store final.
 */
export function usePaginatedSetup<T, F extends Record<string, unknown>>(
  config: Omit<PaginatedStoreConfig<T, F>, 'id'>,
) {
  const { companyId } = useCompanyPath();
  const { isLoading, error, execute: withLoading } = useAsyncOperation({
    errorMessage: 'Error en la operación',
  });

  // --- Estado de paginación ---
  const items = ref<T[]>([]);
  const page = ref(1);
  const limit = ref(config.defaultLimit ?? 20);
  const total = ref(0);
  const filters = ref<F>({ ...config.defaultFilters } as F);
  const sortBy = ref<string | undefined>(undefined);
  const sortDir = ref<'asc' | 'desc'>('asc');
  const lastCompanyId = ref<string | undefined>(undefined);

  // --- Computed ---
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
  const hasPrev = computed(() => page.value > 1);
  const hasNext = computed(() => page.value < totalPages.value);

  // --- Reset al cambiar de empresa ---
  const resetState = () => {
    items.value = [];
    page.value = 1;
    total.value = 0;
    filters.value = { ...config.defaultFilters } as F;
    sortBy.value = undefined;
    sortDir.value = 'asc';
  };

  // --- Fetch principal ---
  const fetch = async (targetPage = page.value) => {
    if (!companyId.value) return;
    if (companyId.value !== lastCompanyId.value) {
      resetState();
      lastCompanyId.value = companyId.value;
    }
    await withLoading(async () => {
      const params = {
        page: targetPage,
        limit: limit.value,
        ...filters.value,
        ...(sortBy.value ? { sortBy: sortBy.value, sortDir: sortDir.value } : {}),
      } as Parameters<typeof config.fetchFn>[0];
      const raw = await config.fetchFn(params);
      const response = unwrap(raw);
      items.value = response.data as T[];
      total.value = response.total;
      page.value = response.page;
      limit.value = response.limit;
    });
  };

  const goToPage = async (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), totalPages.value);
    if (clamped === page.value) return;
    await fetch(clamped);
  };

  const setLimit = async (newLimit: number) => {
    limit.value = newLimit;
    await fetch(1);
  };

  const applyFilters = async (next: Partial<F>) => {
    filters.value = { ...filters.value, ...next } as F;
    await fetch(1);
  };

  const clearFilters = async () => {
    filters.value = { ...config.defaultFilters } as F;
    await fetch(1);
  };

  const setSort = async (sort: ServerSort) => {
    sortBy.value = sort.sortBy;
    sortDir.value = sort.sortDir ?? 'asc';
    await fetch(1);
  };

  /** Refresca la página actual sin cambiar filtros ni sort. */
  const refresh = async () => {
    await fetch(page.value > totalPages.value ? 1 : page.value);
  };

  return {
    items,
    isLoading,
    error,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
    filters,
    sortBy,
    sortDir,
    resetState,
    fetch,
    goToPage,
    setLimit,
    applyFilters,
    clearFilters,
    setSort,
    refresh,
    // Expuesto para que los stores que extienden puedan reutilizar el mismo
    // estado de loading/error para sus operaciones CRUD (create/update/delete).
    // Así hay un único `isLoading` y `error` para toda la vista del módulo.
    withLoading,
  };
}

/**
 * Factory que genera un store Pinia paginado completo sin CRUD extra.
 *
 * Para recursos simples de solo-lectura. Para recursos con CRUD, usa
 * `usePaginatedSetup` directamente dentro de tu `defineStore`.
 *
 * ```ts
 * const useMyStore = createPaginatedStore({
 *   id: 'my-resource',
 *   fetchFn: myService.getItems,
 *   defaultFilters: { search: '', status: '' },
 * });
 * ```
 */
export function createPaginatedStore<T, F extends Record<string, unknown>>(
  config: PaginatedStoreConfig<T, F>,
) {
  return defineStore(config.id, () => usePaginatedSetup<T, F>(config));
}
