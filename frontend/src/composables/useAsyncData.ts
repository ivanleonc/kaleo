import { ref, watch, onMounted, type Ref, type ComputedRef, isRef } from 'vue';
import { apiErrorMessage } from '@/utils/error';

export interface UseAsyncDataOptions {
  /**
   * Ref o ComputedRef a observar. Cuando cambia, se re-ejecuta el fetcher.
   * Útil para re-cargar datos cuando el usuario cambia de empresa o de ruta.
   *
   * @example
   * const { data } = useAsyncData(() => service.get(id), { watch: companyId });
   */
  watch?: Ref<unknown> | ComputedRef<unknown>;
  /**
   * Si es `true` (default), se llama al fetcher en `onMounted`.
   * Poner en `false` si necesitas controlar manualmente cuándo carga.
   */
  immediate?: boolean;
  /**
   * Mensaje de error genérico si el fetcher lanza una excepción sin mensaje API.
   */
  errorMessage?: string;
  /**
   * Callback que se ejecuta justo antes de cada fetch.
   * Útil para limpiar datos previos antes de mostrar el nuevo resultado.
   */
  onBeforeFetch?: () => void;
}

export interface UseAsyncDataReturn<T> {
  /** Datos cargados. `null` mientras no haya cargado o si falló. */
  data: Ref<T | null>;
  /** `true` mientras el fetcher está en vuelo. */
  isLoading: Ref<boolean>;
  /** Mensaje de error si el último fetch falló. `null` si todo fue bien. */
  error: Ref<string | null>;
  /** Re-ejecuta el fetcher manualmente (ej. botón "Reintentar"). */
  reload: () => Promise<void>;
}

/**
 * Composable para carga de datos asíncrona no-paginada.
 *
 * Reemplaza el patrón de ~20 líneas que aparece en Dashboard, Settings,
 * Profile, y en cualquier vista de detalle futura:
 *
 * ```ts
 * // Antes — ~20 líneas en cada vista:
 * const data = ref<X | null>(null);
 * const isLoading = ref(true);
 * const error = ref<string | null>(null);
 * const load = async () => {
 *   isLoading.value = true; error.value = null;
 *   try { data.value = await service.get(id); }
 *   catch (err) { error.value = apiErrorMessage(err, 'Error al cargar'); }
 *   finally { isLoading.value = false; }
 * };
 * onMounted(load);
 * watch(companyId, load);
 *
 * // Ahora — 1–3 líneas:
 * const { data, isLoading, error, reload } = useAsyncData(
 *   () => service.get(id),
 *   { watch: companyId }
 * );
 * ```
 *
 * Para múltiples fetches en paralelo (dashboard multi-métrica), combínalo
 * con `useDashboardData` o usa un solo fetcher con `Promise.all`:
 *
 * ```ts
 * const { data: metrics } = useAsyncData(async () => {
 *   const [members, roles] = await Promise.all([
 *     memberService.getMembers({ limit: 1 }),
 *     roleService.getRoles(),
 *   ]);
 *   return { totalMembers: members.total, totalRoles: roles.length };
 * }, { watch: companyId });
 * ```
 *
 * @param fetcher - Función async que retorna los datos. Se llama en onMounted
 *                  y cada vez que cambia la dep. de `options.watch`.
 * @param options - Opciones de configuración.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions = {},
): UseAsyncDataReturn<T> {
  const {
    watch: watchDep,
    immediate = true,
    errorMessage = 'Error al cargar los datos',
    onBeforeFetch,
  } = options;

  const data = ref<T | null>(null) as Ref<T | null>;
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const reload = async () => {
    onBeforeFetch?.();
    isLoading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
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
    // Omitir immediate en el watch: onMounted ya cubre la primera carga.
    // El watch solo re-fetch cuando la dep. cambia después del mount.
    watch(watchDep, () => {
      // Limpiar data previo de la empresa/ruta anterior antes del nuevo fetch
      // para evitar el flash de datos viejos.
      data.value = null;
      reload();
    });
  }

  return { data, isLoading, error, reload };
}
