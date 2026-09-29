import { ref, onMounted, onUnmounted, type Ref } from 'vue';

/** Resuelve la zona horaria del usuario validándola contra Intl. */
export function resolveUserTimeZone(timezone?: string | null): string | undefined {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}

/** "Hace un momento", "Hace 5m", "Hace 3h", "Hace 2d" o fecha corta. */
export function formatRelativeTime(dateStr: string, now: Date | number = Date.now(), timeZone?: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  const reference = now instanceof Date ? now.getTime() : now;
  const diffSeconds = Math.floor((reference - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'Hace un momento';
  if (diffSeconds < 3600) return `Hace ${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `Hace ${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `Hace ${Math.floor(diffSeconds / 86400)}d`;

  return date.toLocaleDateString(
    'es-ES',
    timeZone ? { day: 'numeric', month: 'short', timeZone } : { day: 'numeric', month: 'short' },
  );
}

/** Fecha y hora absolutas en dd/mm/aaaa hh:mm. */
export function formatDateTime(dateStr: string, timeZone?: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Solo fecha: "12 mar 2026". */
export function formatDate(dateStr: string, timeZone?: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Marca de tiempo para nombres de archivo: 2026-03-12. */
export function dateStamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Reloj reactivo para que los tiempos relativos ("Hace 5m") se actualicen
 * solos. Limpia el intervalo al desmontar el componente.
 */
export function useNowTick(intervalMs = 60000): Ref<number> {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, intervalMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return now;
}
