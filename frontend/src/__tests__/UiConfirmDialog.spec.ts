import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';

// El dialog vive dentro de un UiModal teletransportado a <body>.
const dialogButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.confirm-footer button'));

const confirmButton = () => dialogButtons()[dialogButtons().length - 1] ?? null;

const typedInput = () =>
  document.querySelector<HTMLInputElement>('.typed-confirm input');

const setInput = async (el: HTMLInputElement | null, value: string) => {
  if (!el) throw new Error('typed-confirm input no encontrado');
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
};

let wrapper: VueWrapper | null = null;

const mountDialog = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiConfirmDialog, {
    props: { modelValue: true, title: 'Borrar rol', ...props },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('UiConfirmDialog', () => {
  it('sin requireTypedConfirmation confirma con un solo click', async () => {
    await mountDialog();
    expect(typedInput()).toBeNull();
    expect(confirmButton()?.disabled).toBe(false);
  });

  it('con requireTypedConfirmation bloquea el botón hasta escribir el texto exacto', async () => {
    await mountDialog({ requireTypedConfirmation: 'Soporte' });
    expect(typedInput()).not.toBeNull();
    expect(confirmButton()?.disabled).toBe(true);

    await setInput(typedInput(), 'Sopor');
    expect(confirmButton()?.disabled).toBe(true);

    await setInput(typedInput(), 'Soporte');
    expect(confirmButton()?.disabled).toBe(false);
  });

  it('ignora espacios al comparar pero exige coincidencia exacta', async () => {
    await mountDialog({ requireTypedConfirmation: 'Soporte' });
    await setInput(typedInput(), '  Soporte  ');
    expect(confirmButton()?.disabled).toBe(false);

    await setInput(typedInput(), 'soporte');
    expect(confirmButton()?.disabled).toBe(true);
  });

  it('limpia el texto al reabrir el dialog', async () => {
    const w = await mountDialog({ requireTypedConfirmation: 'Soporte' });
    await setInput(typedInput(), 'Soporte');
    expect(confirmButton()?.disabled).toBe(false);

    await w.setProps({ modelValue: false });
    await w.setProps({ modelValue: true });
    expect(typedInput()?.value).toBe('');
    expect(confirmButton()?.disabled).toBe(true);
  });

  it('emite confirm solo cuando está habilitado', async () => {
    const w = await mountDialog({ requireTypedConfirmation: 'Soporte' });
    await setInput(typedInput(), 'Soporte');
    confirmButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(w.emitted('confirm')).toHaveLength(1);
  });
});
