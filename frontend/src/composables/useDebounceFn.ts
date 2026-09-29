import { onUnmounted } from 'vue';

/**
 * Debounce con limpieza automática al desmontar el componente.
 *
 * Evita que un temporizador pendiente dispare acciones sobre un componente ya
 * destruido (un bug presente en el debounce de la vista de auditoría).
 *
 * @param delay milisegundos de espera
 */
export function useDebounceFn<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 300,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  onUnmounted(() => debounced.cancel());

  return debounced;
}
