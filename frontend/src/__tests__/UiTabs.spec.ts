import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import UiTabs from '@/components/ui/UiTabs.vue';

const TABS = [
  { value: 'uno', label: 'Uno' },
  { value: 'dos', label: 'Dos', count: 3 },
  { value: 'tres', label: 'Tres' },
];

const mountTabs = (modelValue = 'uno') =>
  mount(UiTabs, {
    props: {
      modelValue,
      tabs: TABS,
      groupLabel: 'Secciones de prueba',
      panelIdPrefix: 'demo',
    },
  });

describe('UiTabs', () => {
  it('renderiza el tablist y marca el tab activo', () => {
    const wrapper = mountTabs();

    expect(wrapper.attributes('role')).toBe('tablist');
    expect(wrapper.attributes('aria-label')).toBe('Secciones de prueba');

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.attributes('aria-selected')).toBe('true');
    expect(tabs[1]?.attributes('aria-selected')).toBe('false');
    expect(tabs[0]?.attributes('tabindex')).toBe('0');
    expect(tabs[1]?.attributes('tabindex')).toBe('-1');
  });

  it('conecta aria-controls con el panel y muestra el contador', () => {
    const wrapper = mountTabs();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[1]?.attributes('aria-controls')).toBe('demo-panel-dos');
    expect(tabs[1]?.text()).toContain('3');
  });

  it('emite update:modelValue al hacer clic', async () => {
    const wrapper = mountTabs();

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['dos']);
  });

  it('navega con flechas, Home y End', async () => {
    const wrapper = mountTabs();

    await wrapper.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['dos']);

    await wrapper.setProps({ modelValue: 'tres' });
    await wrapper.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['dos']);

    await wrapper.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual(['uno']);

    await wrapper.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')?.[3]).toEqual(['tres']);
  });
});
