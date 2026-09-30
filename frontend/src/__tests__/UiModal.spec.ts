import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiModal from '@/components/ui/UiModal.vue';

// El modal se renderiza en un Teleport a <body>, así que se consulta el documento.
const overlay = () => document.querySelector('.modal-overlay') as HTMLElement | null;
const confirmDialog = () => document.querySelector('[role="alertdialog"]');
const confirmButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.modal-confirm-actions button'));

const click = async (el?: Element | null) => {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
};

const pressEscape = async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await nextTick();
};

let wrapper: VueWrapper | null = null;

const mountModal = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiModal, {
    props: { modelValue: true, ...props },
    slots: { default: '<p class="body">Contenido</p>' },
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
  document.body.style.overflow = '';
});

describe('UiModal', () => {
  it('renderiza el contenido cuando está abierto', async () => {
    await mountModal();
    expect(overlay()).not.toBeNull();
    expect(document.querySelector('.body')).not.toBeNull();
  });

  it('bloquea el scroll del fondo mientras está abierto', async () => {
    document.body.style.overflow = 'auto';
    await mountModal();
    expect(document.body.style.overflow).toBe('hidden');

    await wrapper!.setProps({ modelValue: false });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('cierra al pedir confirmación en un formulario sin cambios', async () => {
    await mountModal({ confirmOnDirty: true, dirty: false });
    await click(overlay());

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
    expect(confirmDialog()).toBeNull();
  });

  it('pide confirmación antes de descartar cambios', async () => {
    await mountModal({ confirmOnDirty: true, dirty: true });
    await click(overlay());

    // Sigue abierto, pero con la confirmación en su lugar.
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(confirmDialog()).not.toBeNull();
    expect(document.querySelector('.body')).toBeNull();
  });

  it('vuelve al formulario al cancelar el descarte', async () => {
    await mountModal({ confirmOnDirty: true, dirty: true });
    await click(overlay());
    await click(confirmButtons()[0]);

    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(confirmDialog()).toBeNull();
    expect(document.querySelector('.body')).not.toBeNull();
  });

  it('cierra al confirmar el descarte', async () => {
    await mountModal({ confirmOnDirty: true, dirty: true });
    await click(overlay());
    await click(confirmButtons()[1]);

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('no usa window.confirm (rompería el diseño y el idioma)', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    await mountModal({ confirmOnDirty: true, dirty: true });
    await click(overlay());

    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });

  it('Escape pide confirmación cuando hay cambios sin guardar', async () => {
    await mountModal({ confirmOnDirty: true, dirty: true });
    await pressEscape();

    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(confirmDialog()).not.toBeNull();

    await click(confirmButtons()[1]);
    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('Escape cierra directamente si no hay cambios', async () => {
    await mountModal({ confirmOnDirty: true, dirty: false });
    await pressEscape();

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
  });
});
