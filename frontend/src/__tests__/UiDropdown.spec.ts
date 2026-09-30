import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const qa = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
const press = async (key: string) => {
  const menu = document.querySelector('[role="menu"]') as HTMLElement;
  menu?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await nextTick();
};

const mountDropdown = async () => {
  wrapper = mount(UiDropdown, {
    props: { label: 'Acciones de usuario' },
    slots: {
      trigger: `<template #trigger="{ toggle, triggerAria }">
        <button class="trigger" v-bind="triggerAria" @click="toggle">Abrir</button>
      </template>`,
      default: () => [
        h(UiDropdownItem, { class: 'item-uno' }, () => 'Editar'),
        h(UiDropdownItem, { class: 'item-dos' }, () => 'Eliminar'),
      ],
    },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
};

const openDropdown = async () => {
  await mountDropdown();
  document.querySelector<HTMLButtonElement>('.trigger')?.click();
  await nextTick();
  await nextTick();
};

const focusedText = () => (document.activeElement as HTMLElement | null)?.textContent?.trim();

describe('UiDropdown', () => {
  it('el menú se teletransporta al body con role y etiqueta', async () => {
    await openDropdown();
    const menu = document.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.getAttribute('aria-label')).toBe('Acciones de usuario');
  });

  it('mueve el foco al primer item al abrir', async () => {
    await openDropdown();
    expect(focusedText()).toBe('Editar');
  });

  it('navega hacia abajo y envuelve al final', async () => {
    await openDropdown();
    await press('ArrowDown');
    expect(focusedText()).toBe('Eliminar');
    await press('ArrowDown');
    expect(focusedText()).toBe('Editar');
  });

  it('navega hacia arriba y envuelve al principio', async () => {
    await openDropdown();
    await press('ArrowUp');
    expect(focusedText()).toBe('Eliminar');
  });

  it('Home y End saltan a los extremos', async () => {
    await openDropdown();
    await press('End');
    expect(focusedText()).toBe('Eliminar');
    await press('Home');
    expect(focusedText()).toBe('Editar');
  });

  it('Escape cierra y devuelve el foco al trigger', async () => {
    await openDropdown();
    await press('Escape');

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement?.classList.contains('trigger')).toBe(true);
  });

  it('Tab no se intercepta para poder usar inputs dentro del menú', async () => {
    await openDropdown();
    await press('Tab');
    // El menú sigue abierto: el cierre ocurre al salir del foco, no al tabular.
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('cerrar al mover el foco fuera del menú y del disparador', async () => {
    await openDropdown();
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    menu.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await nextTick();

    expect(document.querySelector('[role="menu"]')).toBeNull();
    outside.remove();
  });

  it('no se cierra si el foco sigue dentro del menú', async () => {
    await openDropdown();
    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    const item = menu.querySelector('[role="menuitem"]') as HTMLElement;
    menu.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: item }));
    await nextTick();

    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('activar un item lo cierra', async () => {
    await openDropdown();
    document.querySelector<HTMLButtonElement>('.item-uno')?.click();
    await nextTick();

    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('el overlay cierra el menú', async () => {
    await openDropdown();
    document.querySelector<HTMLElement>('.ui-dropdown-overlay')?.click();
    await nextTick();

    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('los items siguen siendo botones accesibles', async () => {
    await openDropdown();
    const items = qa('[role="menuitem"]');
    expect(items).toHaveLength(2);
    expect(items[0]?.tagName).toBe('BUTTON');
    expect(items[0]?.getAttribute('type')).toBe('button');
  });

  it('el disparador anuncia que abre un menú y su estado', async () => {
    await mountDropdown();
    const trigger = document.querySelector<HTMLElement>('.trigger');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    trigger?.click();
    await nextTick();
    await nextTick();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });
});
