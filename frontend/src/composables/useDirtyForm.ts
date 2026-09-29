import { ref, computed, type Ref } from 'vue';

/**
 * Detecta cambios sin guardar en un formulario.
 *
 * Antes cada vista mantenía su propio snapshot con `JSON.stringify` y un
 * `computed` comparativo (8 implementaciones, dos de las cuales repetían
 * literalmente el mismo objeto de campos). Aquí se pasa un *selector* de los
 * campos que importan, de modo que agregar un campo no obliga a editar dos
 * sitios.
 *
 * La comparación es siempre profunda porque el estado de los formularios es
 * plano; no se expone opción porque nunca hubo un caso de uso superficial.
 *
 * @param select campos a vigilar (normalmente un objeto derivado del form)
 *
 * @example
 * const { isDirty, capture, clear } = useDirtyForm(() => ({ ...form }));
 * capture(); // al abrir el modal
 * clear();    // tras guardar, si el formulario se vació
 */
export function useDirtyForm<T>(select: () => T) {
  const snapshot = ref<string>('');

  const currentValue = (): string => JSON.stringify(select() ?? null);

  const capture = () => {
    snapshot.value = currentValue();
  };

  const isDirty = computed(() => snapshot.value !== '' && snapshot.value !== currentValue());

  const reset = () => {
    snapshot.value = currentValue();
  };

  /** Limpia el snapshot: el formulario pasa a considerarse "sin cambios". */
  const clear = () => {
    snapshot.value = '';
  };

  return { isDirty, snapshot: snapshot as Ref<string>, capture, reset, clear };
}
