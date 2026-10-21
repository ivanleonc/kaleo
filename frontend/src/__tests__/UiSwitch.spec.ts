import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountSwitch = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiSwitch, {
    props: {
      modelValue: false,
      label: 'Sede principal',
      description: 'Ubicación predeterminada',
      ...props,
    },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

describe('UiSwitch', () => {
  it('expone el control como switch accesible y describe su ayuda', async () => {
    await mountSwitch();
    const input = document.querySelector<HTMLInputElement>('input[role="switch"]');
    const description = document.querySelector<HTMLElement>('.switch-description');

    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(false);
    expect(description?.textContent).toContain('Ubicación predeterminada');
    expect(input?.getAttribute('aria-describedby')).toBe(description?.id);
  });

  it('emite el nuevo valor al activarse', async () => {
    await mountSwitch();
    const input = document.querySelector<HTMLInputElement>('input[role="switch"]');
    input!.checked = true;
    input!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(wrapper!.emitted('update:modelValue')).toEqual([[true]]);
  });

  it('no permite interactuar cuando está deshabilitado', async () => {
    await mountSwitch({ disabled: true });
    const input = document.querySelector<HTMLInputElement>('input[role="switch"]');
    expect(input?.disabled).toBe(true);
  });
});
