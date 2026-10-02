import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Consume el query `?crear=1` que envía la paleta de comandos (Ctrl+K):
 * abre el modal de creación al montar y limpia el query inmediatamente.
 *
 * Limpiar es obligatorio: el cambio de empresa conserva el query en la URL,
 * y sin esto el modal se reabriría solo al cambiar de organización.
 */
export function useCreateAction(open: () => void) {
  const route = useRoute();
  const router = useRouter();
  onMounted(() => {
    if (route.query?.crear === '1') {
      const q = { ...route.query };
      delete q.crear;
      router.replace({ query: q }).catch(() => {});
      open();
    }
  });
}
