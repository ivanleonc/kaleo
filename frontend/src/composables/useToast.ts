import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

const toasts = ref<Toast[]>([]);
let nextId = 1;

const DEFAULT_DURATION_MS = 4000;
const STICKY_DURATION_MS = 0;
const MAX_VISIBLE = 3;

const timers = new Map<number, number>();
const startedAt = new Map<number, number>();
const remaining = new Map<number, number>();

export function useToast() {
  const clearTimer = (id: number) => {
    const handle = timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timers.delete(id);
    }
    startedAt.delete(id);
  };

  const schedule = (id: number, ms: number) => {
    if (ms <= 0) return;
    clearTimer(id);
    startedAt.set(id, Date.now());
    timers.set(id, window.setTimeout(() => dismiss(id), ms));
  };

  const dismiss = (id: number): void => {
    clearTimer(id);
    remaining.delete(id);
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  /** Congela el auto-descarte: se usa al pasar el puntero o el foco por encima. */
  const pause = (id: number) => {
    const start = startedAt.get(id);
    const total = remaining.get(id);
    if (start === undefined || total === undefined) return;
    clearTimer(id);
    remaining.set(id, Math.max(0, total - (Date.now() - start)));
  };

  const resume = (id: number) => {
    const left = remaining.get(id);
    if (left === undefined) return;
    schedule(id, left);
  };

  const runAction = (toast: Toast) => {
    toast.action?.onClick();
    dismiss(toast.id);
  };

  const push = (
    type: ToastType,
    message: string,
    options: { duration?: number; action?: ToastAction } = {},
  ): number => {
    const duration = options.duration ?? DEFAULT_DURATION_MS;
    const id = nextId++;
    toasts.value.push({ id, type, message, action: options.action });
    remaining.set(id, duration);

    // Tope de notificaciones simultáneas: se descartan las más antiguas.
    while (toasts.value.length > MAX_VISIBLE) {
      const oldest = toasts.value[0];
      if (!oldest) break;
      dismiss(oldest.id);
    }

    schedule(id, duration);
    return id;
  };

  const clear = (): void => {
    toasts.value.forEach((t) => clearTimer(t.id));
    remaining.clear();
    toasts.value = [];
  };

  return {
    toasts,
    success: (message: string, options?: { duration?: number }) =>
      push('success', message, options),
    error: (message: string, options?: { duration?: number }) =>
      push('error', message, { duration: 6500, ...options }),
    warning: (message: string, options?: { duration?: number }) =>
      push('warning', message, options),
    info: (message: string, options?: { duration?: number }) => push('info', message, options),
    /** Aviso con acción (típico: "Deshacer"). No se autodescarta. */
    withAction: (
      type: ToastType,
      message: string,
      action: ToastAction,
      options: { duration?: number } = {},
    ) => push(type, message, { duration: STICKY_DURATION_MS, action, ...options }),
    pause,
    resume,
    runAction,
    dismiss,
    clear,
  };
}
