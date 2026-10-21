import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UiSteps from '@/components/ui/UiSteps.vue';

const steps = [
  { number: 1, label: 'Archivo' },
  { number: 2, label: 'Procesar' },
  { number: 3, label: 'Guardar' },
];

describe('UiSteps', () => {
  it('marca el paso actual y los anteriores como completados', () => {
    const wrapper = mount(UiSteps, { props: { steps, current: 2 } });
    const items = wrapper.findAll('li');

    expect(items[0]!.classes()).toContain('is-done');
    expect(items[1]!.classes()).toContain('is-current');
    expect(items[1]!.attributes('aria-current')).toBe('step');
    expect(items[2]!.classes()).toContain('is-pending');
  });

  it('marca error y completado global', () => {
    const failed = mount(UiSteps, { props: { steps, current: 3, errorAt: 3 } });
    expect(failed.findAll('li')[2]!.classes()).toContain('is-error');

    const complete = mount(UiSteps, { props: { steps, current: 3, complete: true } });
    expect(complete.findAll('li').every((item) => item.classes().includes('is-done'))).toBe(true);
  });

  it('genera las columnas según el número de pasos', () => {
    const wrapper = mount(UiSteps, { props: { steps, current: 1 } });
    expect(wrapper.attributes('style')).toContain('--step-count: 3');
  });
});
