import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiTimezoneSelect from '@/components/ui/UiTimezoneSelect.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountTimezone = async (modelValue = '') => {
  wrapper = mount(UiTimezoneSelect, {
    props: { modelValue },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const openTimezone = async () => {
  await wrapper!.find('.ui-select-input').trigger('click');
  await nextTick();
  await nextTick();
};

describe('UiTimezoneSelect', () => {
  it('agrupa las zonas por región', async () => {
    await mountTimezone();
    await openTimezone();

    const labels = Array.from(document.querySelectorAll('.ui-select-group-label')).map((label) =>
      label.textContent?.trim(),
    );
    expect(labels).toEqual([
      'Global',
      'Norteamérica',
      'Centroamérica y Caribe',
      'Sudamérica',
      'Europa',
      'Asia y Oceanía',
    ]);
  });

  it('muestra primero una zona personalizada que no está en la lista', async () => {
    await mountTimezone('America/Argentina/Cordoba');
    await openTimezone();

    const labels = Array.from(document.querySelectorAll('.ui-select-group-label')).map((label) =>
      label.textContent?.trim(),
    );
    const options = Array.from(document.querySelectorAll('[role="option"]')).map((option) =>
      option.textContent?.trim(),
    );

    expect(labels[0]).toBe('Personalizada');
    expect(options[0]).toContain('America/Argentina/Cordoba (personalizada)');
  });
});
