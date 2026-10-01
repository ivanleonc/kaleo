/**
 * Detecta si el navegador tiene conexión a internet.
 *
 * Usa los eventos nativos `online`/`offline` del navegador.
 * Se limpia solo al desmontar el componente que lo llame.
 *
 * Nota: `navigator.onLine` puede dar falsos positivos (red local sin internet),
 * pero es suficiente para el aviso de UX — no bloquea operaciones.
 */
import { ref, onMounted, onUnmounted } from 'vue';

export function useOnlineStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const handleOnline = () => { isOnline.value = true; };
  const handleOffline = () => { isOnline.value = false; };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return { isOnline };
}
