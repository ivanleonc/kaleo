import { watch, type Ref } from 'vue';
import { useDebounceFn } from '@/composables/useDebounceFn';

/**
 * Conecta los valores de `UiTableFilters` con el fetch server-side.
 *
 * Un solo watcher profundo cubre todas las claves: así ningún filtro queda
 * "muerto" (como le pasó al select de entidad de auditoría, que no tenía
 * ni watcher ni @change). El debounce evita un request por tecla y el catch
 * evita unhandled rejections — el error ya vive en el store y la vista lo
 * muestra.
 *
 * @param values objeto reactivo con una clave por filtro (`''` = inactivo)
 * @param apply recibe una copia de los valores y dispara el fetch del store
 * @param delay ms de debounce para el texto (los selects también pasan por
 *   aquí: un solo camino para todos)
 */
export function useFilterSync<T extends Record<string, string>>(
  values: Ref<T>,
  apply: (values: T) => unknown | Promise<unknown>,
  delay = 350,
) {
  const applyDebounced = useDebounceFn(() => {
    Promise.resolve()
      .then(() => apply({ ...values.value }))
      .catch(() => {});
  }, delay);

  watch(values, () => applyDebounced(), { deep: true });

  return { applyDebounced };
}
