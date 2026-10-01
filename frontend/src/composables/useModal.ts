import { ref } from 'vue';

/**
 * Abstrae el patrón isOpen/target/open/close que se repite en cada vista.
 *
 * Antes: 5-8 pares `ref(false)` + `ref(null)` por vista.
 * Ahora: `const editModal = useModal<Member>()` cubre los 4 conceptos.
 *
 * Uso:
 * ```ts
 * const editModal = useModal<Member>();
 * // Abrir con target:
 * editModal.open(member);
 * // Abrir sin target (ej. modal de creación):
 * editModal.open();
 * // En template: v-model="editModal.isOpen" + :target="editModal.target"
 * ```
 */
export function useModal<T = null>() {
  const isOpen = ref(false);
  const target = ref<T | null>(null);

  const open = (item?: T) => {
    target.value = item ?? null;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    // No limpiamos target inmediatamente para que el modal no "salte" en la
    // animación de cierre. La vista lo limpia en el evento @after-leave si
    // lo necesita.
  };

  const reset = () => {
    isOpen.value = false;
    target.value = null;
  };

  return { isOpen, target, open, close, reset };
}
