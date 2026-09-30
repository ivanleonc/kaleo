import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useFilterSync } from '@/composables/useFilterSync';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useFilterSync', () => {
  it('dispara el apply con debounce al cambiar cualquier clave', async () => {
    const values = ref({ search: '', status: '' });
    const apply = vi.fn();
    useFilterSync(values, apply, 350);

    values.value = { ...values.value, search: 'a' };
    values.value = { ...values.value, search: 'an' };
    values.value = { ...values.value, search: 'ana' };
    expect(apply).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(350);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ search: 'ana', status: '' });
  });

  it('un select también pasa por el mismo camino (sin triggers manuales)', async () => {
    const values = ref({ search: '', status: '' });
    const apply = vi.fn();
    useFilterSync(values, apply, 350);

    values.value = { ...values.value, status: 'inactive' };
    await vi.advanceTimersByTimeAsync(350);

    expect(apply).toHaveBeenCalledWith({ search: '', status: 'inactive' });
  });

  it('un apply fallido no deja unhandled rejections', async () => {
    const values = ref({ search: '' });
    const apply = vi.fn().mockRejectedValue(new Error('caído'));
    useFilterSync(values, apply, 100);

    values.value = { search: 'x' };
    // Si el catch interno faltara, este advance lanzaría el rechazo aquí.
    await vi.advanceTimersByTimeAsync(100);
    expect(apply).toHaveBeenCalled();
  });
});
