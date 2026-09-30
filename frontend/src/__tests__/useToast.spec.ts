import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '@/composables/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    useToast().clear();
    vi.useRealTimers();
  });

  it('añade toasts con su tipo y mensaje', () => {
    const { success, error, warning, info, toasts } = useToast();
    success('Guardado');
    error('Falló');
    info('Aviso');

    expect(toasts.value.map((t) => t.type)).toEqual(['success', 'error', 'info']);
    expect(toasts.value[0]?.message).toBe('Guardado');

    // El tope de la pila se cubre en su propio test.
    expect(warning('Revisa')).toBeTypeOf('number');
    expect(toasts.value.map((t) => t.type)).toEqual(['error', 'info', 'warning']);
  });

  it('descarta automáticamente pasado el tiempo por defecto', () => {
    const { success, toasts } = useToast();
    success('Guardado');

    vi.advanceTimersByTime(3999);
    expect(toasts.value).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts.value).toHaveLength(0);
  });

  it('los errores duran más que el resto', () => {
    const { error, toasts } = useToast();
    error('Falló');

    vi.advanceTimersByTime(5000);
    expect(toasts.value).toHaveLength(1);

    vi.advanceTimersByTime(1500);
    expect(toasts.value).toHaveLength(0);
  });

  it('respeta una duración explícita', () => {
    const { info, toasts } = useToast();
    info('Temporal', { duration: 1000 });

    vi.advanceTimersByTime(1000);
    expect(toasts.value).toHaveLength(0);
  });

  it('un toast con acción no se autodescarta', () => {
    const onClick = vi.fn();
    const { withAction, toasts } = useToast();
    withAction('success', 'Sede desactivada', { label: 'Deshacer', onClick });

    vi.advanceTimersByTime(60_000);
    expect(toasts.value).toHaveLength(1);
  });

  it('ejecuta la acción y cierra el toast', () => {
    const onClick = vi.fn();
    const { withAction, toasts, runAction } = useToast();
    const id = withAction('success', 'Sede desactivada', { label: 'Deshacer', onClick });

    const toast = toasts.value[0];
    expect(toast).toBeDefined();
    runAction(toast!);

    expect(onClick).toHaveBeenCalledOnce();
    expect(toasts.value.find((t) => t.id === id)).toBeUndefined();
  });

  it('pausa y reanuda conservando el tiempo restante', () => {
    const { success, toasts, pause, resume } = useToast();
    const id = success('Guardado', { duration: 4000 });

    vi.advanceTimersByTime(1000);
    pause(id);
    expect(toasts.value).toHaveLength(1);

    // El auto-descarte no avanza mientras está pausado.
    vi.advanceTimersByTime(10_000);
    expect(toasts.value).toHaveLength(1);

    // Quedaban 3000 ms: reanudar reinicia solo esa ventana.
    resume(id);
    vi.advanceTimersByTime(2999);
    expect(toasts.value).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts.value).toHaveLength(0);
  });

  it('reanudar tras agotar el tiempo descarta el toast', () => {
    const { success, toasts, pause, resume } = useToast();
    const id = success('Guardado', { duration: 1000 });

    vi.advanceTimersByTime(1000);
    pause(id);
    resume(id);

    expect(toasts.value).toHaveLength(0);
  });

  it('mantiene como máximo 3 toasts y descarta los más antiguos', () => {
    const { success, toasts } = useToast();
    success('Uno', { duration: 0 });
    success('Dos', { duration: 0 });
    success('Tres', { duration: 0 });
    success('Cuatro', { duration: 0 });

    expect(toasts.value).toHaveLength(3);
    expect(toasts.value.map((t) => t.message)).toEqual(['Dos', 'Tres', 'Cuatro']);
  });

  it('clear vacía la pila y cancela los temporizadores', () => {
    const { success, toasts, clear } = useToast();
    success('Uno');
    success('Dos');

    clear();
    expect(toasts.value).toHaveLength(0);

    // Ningún temporizador huérfano debe volver a disparar dismiss.
    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow();
    expect(toasts.value).toHaveLength(0);
  });

  it('comparte estado entre instancias del composable', () => {
    const a = useToast();
    const b = useToast();
    a.success('Desde a');

    expect(b.toasts.value).toHaveLength(1);
    const [toast] = b.toasts.value;
    expect(toast).toBeDefined();
    b.dismiss(toast!.id);
    expect(a.toasts.value).toHaveLength(0);
  });
});
