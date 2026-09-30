import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

const q = (sel: string) => document.querySelector(sel);
const qa = (sel: string) => Array.from(document.querySelectorAll<HTMLButtonElement>(sel));
const click = async (el?: Element | null) => {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
};

const mountForm = async (dirty: boolean) => {
  wrapper = mount(UiFormModal, {
    props: {
      modelValue: true,
      title: 'Editar sede',
      confirmOnDirty: true,
      dirty,
    },
    slots: {
      default: '<p class="body">Campos</p>',
      // El footer replica el de las vistas: Cancelar debe pasar por requestClose.
      footer: `<template #footer="{ requestClose }">
        <button class="cancelar" @click="requestClose()">Cancelar</button>
      </template>`,
    },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

describe('UiFormModal', () => {
  it('el botón Cancelar pide confirmación si hay cambios', async () => {
    await mountForm(true);
    expect(q('.cancelar')).not.toBeNull();

    await click(q('.cancelar'));

    // No se cerró: sigue abierto pidiendo confirmación.
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(q('[role="alertdialog"]')).not.toBeNull();
  });

  it('el botón Cancelar cierra si no hay cambios', async () => {
    await mountForm(false);
    await click(q('.cancelar'));

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('descartar desde el botón Cancelar cierra el modal', async () => {
    await mountForm(true);
    await click(q('.cancelar'));
    await click(qa('.modal-confirm-actions button')[1]);

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
  });
});
