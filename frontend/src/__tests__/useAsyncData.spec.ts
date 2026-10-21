import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { useAsyncData, type UseAsyncDataReturn } from '@/composables/useAsyncData';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

function mountComposable(options: {
  fetcher: () => Promise<string>;
  dep?: Ref<number>;
  enabled?: Ref<boolean>;
}) {
  let api: UseAsyncDataReturn<string> | undefined;

  wrapper = mount(
    defineComponent({
      setup() {
        api = useAsyncData(options.fetcher, {
          watch: options.dep,
          enabled: options.enabled,
        });
        return () => h('div');
      },
    }),
  );

  return () => api!;
}

describe('useAsyncData', () => {
  it('carga al montar cuando está habilitado', async () => {
    const fetcher = vi.fn().mockResolvedValue('datos');
    const getApi = mountComposable({ fetcher });

    await flushPromises();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getApi().data.value).toBe('datos');
  });

  it('no ejecuta el fetcher mientras está deshabilitado', async () => {
    const fetcher = vi.fn().mockResolvedValue('datos');
    const enabled = ref(false);
    const getApi = mountComposable({ fetcher, enabled });

    await flushPromises();

    expect(fetcher).not.toHaveBeenCalled();
    expect(getApi().isLoading.value).toBe(false);
  });

  it('carga cuando se habilita y limpia datos al deshabilitarse', async () => {
    const fetcher = vi.fn().mockResolvedValue('datos');
    const enabled = ref(false);
    const dep = ref(0);
    const getApi = mountComposable({ fetcher, enabled, dep });

    enabled.value = true;
    await nextTick();
    await flushPromises();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getApi().data.value).toBe('datos');

    enabled.value = false;
    await nextTick();
    await flushPromises();

    expect(getApi().data.value).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('recarga al cambiar la dependencia y expone errores', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('uno')
      .mockRejectedValueOnce(new Error('caído'));
    const dep = ref(0);
    const getApi = mountComposable({ fetcher, dep });

    await flushPromises();
    expect(getApi().data.value).toBe('uno');

    dep.value = 1;
    await nextTick();
    await flushPromises();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(getApi().data.value).toBeNull();
    expect(getApi().error.value).toBe('caído');
    expect(getApi().isLoading.value).toBe(false);
  });
});
