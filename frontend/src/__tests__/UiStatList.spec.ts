import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UiStatList from '@/components/ui/UiStatList.vue';

const items = [
  { label: 'Periodo', value: 'Enero 2026' },
  { label: 'Registros', value: '1.240' },
  { label: 'Autor', value: 'Ana' },
];

describe('UiStatList', () => {
  it('renderiza una lista de definición semántica', () => {
    const wrapper = mount(UiStatList, { props: { items, label: 'Contexto' } });
    expect(wrapper.element.tagName).toBe('DL');
    expect(wrapper.attributes('aria-label')).toBe('Contexto');
    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(items.map((item) => item.label));
    expect(wrapper.findAll('dd').map((dd) => dd.text())).toEqual(items.map((item) => item.value));
  });

  it('aplica el layout inline y las columnas del grid', () => {
    const inline = mount(UiStatList, { props: { items, layout: 'inline' } });
    expect(inline.classes()).toContain('is-inline');

    const grid = mount(UiStatList, { props: { items, layout: 'grid', columns: 2 } });
    expect(grid.classes()).toContain('is-grid');
    expect(grid.attributes('style')).toContain('--stat-columns: 2');
  });
});
