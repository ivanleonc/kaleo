import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('UiActionMenu', () => {
  it('usa el trigger kebab con etiqueta específica y abre el menú', async () => {
    wrapper = mount(UiActionMenu, {
      props: {
        label: 'Acciones del análisis',
        triggerLabel: 'Acciones para Ventas 2026',
      },
      slots: {
        default: () => h(UiDropdownItem, () => 'Editar'),
      },
      attachTo: document.body,
    });

    const trigger = wrapper.get('button');
    expect(trigger.attributes('aria-label')).toBe('Acciones para Ventas 2026');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    expect(trigger.attributes('aria-expanded')).toBe('false');

    await trigger.trigger('click');
    await nextTick();
    await nextTick();

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(document.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
      'Acciones del análisis',
    );
  });

  it('permite un trigger personalizado con acceso a toggle y aria', async () => {
    wrapper = mount(UiActionMenu, {
      props: { label: 'Acciones del miembro' },
      slots: {
        trigger: `<template #trigger="{ toggle, triggerAria }">
          <button class="custom-trigger" v-bind="triggerAria" @click="toggle">Abrir</button>
        </template>`,
        default: () => h(UiDropdownItem, () => 'Editar'),
      },
      attachTo: document.body,
    });

    const trigger = wrapper.get('.custom-trigger');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');

    await trigger.trigger('click');
    await nextTick();
    await nextTick();

    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });
});
