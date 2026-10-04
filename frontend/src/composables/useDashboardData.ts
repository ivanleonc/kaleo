import { ref, watch, onMounted, type Ref, type ComputedRef } from 'vue';
import { apiErrorMessage } from '@/utils/error';

type FetcherMap = Record<string, () => Promise<unknown>>;
type FetcherResults<T extends FetcherMap> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>> | null;
};

export interface UseDashboardDataOptions {
  /**
   * Ref o ComputedRef a observar para re-fetch automático.
   * Útil cuando los datos dependen del tenant activo (`companyId`).
   */
  watch?: Ref<unknown> | ComputedRef<unknown>;
  /**
   * Si es `true` (default), carga en onMounted automáticamente.
   */
  immediate?: boolean;
  /**
   * Mensaje genérico si todos los fetchers fallan.
   */
  errorMessage?: string;
}

/**
 * Composable para dashboards multi-métrica con fetches paralelos.
 *
 * Ejecuta todos los fetchers en paralelo (Promise.allSettled) con un único
 * estado de loading/error compartido. Si un fetcher individual falla,
 * su resultado queda en `null` sin bloquear los demás.
 *
 * ```ts
 * const { results, isLoading, error, reload } = useDashboardData({
 *   members: () => memberService.getMembers({ limit: 1 }),
 *   branches: () => branchService.getBranches({ limit: 1 }),
 *   revenue:  () => invoiceService.getSummary(),
 * }, { watch: companyId });
 *
 * // results.members, results.branches, results.revenue — tipados según el fetcher
 * ```
 *
 * Para un único fetch sin tipado múltiple, preferir `useAsyncData` con Promise.all.
 */
export function useDashboardData<T extends FetcherMap>(
  fetchers: T,
  options: UseDashboardDataOptions = {},
) {
  const {
    watch: watchDep,
    immediate = true,
    errorMessage = 'Error al cargar los datos del dashboard',
  } = options;

  // Inicializa todos los resultados en null
  const results = ref<FetcherResults<T>>(
    Object.fromEntries(Object.keys(fetchers).map((k) => [k, null])) as FetcherResults<T>,
  );
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const reload = async () => {
    isLoading.value = true;
    error.value = null;

    // Reinicia resultados para evitar flash de datos viejos
    results.value = Object.fromEntries(
      Object.keys(fetchers).map((k) => [k, null]),
    ) as FetcherResults<T>;

    try {
      const entries = Object.entries(fetchers);
      const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));

      const next = { ...results.value };
      settled.forEach((result, i) => {
        const key = entries[i]![0] as keyof T;
        if (result.status === 'fulfilled') {
          next[key] = result.value as Awaited<ReturnType<T[typeof key]>>;
        } else {
          // El fetcher falló: mantiene null; el error parcial no bloquea el resto
          console.warn(`[useDashboardData] Error en '${String(key)}':`, result.reason);
        }
      });
      results.value = next;
    } catch (err: unknown) {
      error.value = apiErrorMessage(err, errorMessage);
    } finally {
      isLoading.value = false;
    }
  };

  if (immediate) {
    onMounted(reload);
  }

  if (watchDep) {
    watch(watchDep, () => {
      reload();
    });
  }

  return {
    results: results as Ref<FetcherResults<T>>,
    isLoading,
    error,
    reload,
  };
}
