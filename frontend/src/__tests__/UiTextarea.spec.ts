import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiTextarea from '@/components/ui/UiTextarea.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountTextarea = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiTextarea, {
    props: { modelValue: '', label: 'Descripción', ...props },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

describe('UiTextarea', () => {
  it('asocia la etiqueta y marca los campos obligatorios', async () => {
    await mountTextarea({ required: true });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
    const label = document.querySelector<HTMLLabelElement>('label');

    expect(label?.htmlFor).toBe(textarea?.id);
    expect(label?.textContent).toContain('*');
    expect(textarea?.required).toBe(true);
  });

  it('emite los cambios del texto', async () => {
    await mountTextarea();
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = 'Rol de finanzas';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(wrapper!.emitted('update:modelValue')).toEqual([['Rol de finanzas']]);
  });

  it('relaciona el error con el campo', async () => {
    await mountTextarea({ error: 'Texto demasiado largo' });
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
    const error = document.querySelector<HTMLElement>('.ui-field-error');

    expect(textarea?.getAttribute('aria-invalid')).toBe('true');
    expect(textarea?.getAttribute('aria-describedby')).toBe(error?.id);
    expect(error?.textContent).toContain('Texto demasiado largo');
  });
});
