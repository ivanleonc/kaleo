import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiMultiSelect from '@/components/ui/UiMultiSelect.vue';

const options = [
  { label: 'Todos', value: '' },
  { label: 'Activo', value: 'active', tone: 'success' as const },
  { label: 'Suspendido', value: 'suspended', tone: 'warning' as const },
  { label: 'Ciudad de México', value: 'mexico', group: 'Norteamérica' },
  { label: 'Bogotá', value: 'bogota', group: 'Sudamérica', description: 'GMT-5' },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountSelect = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiSelect, {
    props: { options, modelValue: '', ...props },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const openSelect = async () => {
  await wrapper!.find('.ui-select-input').trigger('click');
  await nextTick();
  await nextTick();
};

const visibleOptions = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).filter(
    (option) => !option.closest('[hidden]'),
  );

describe('UiSelect', () => {
  it('muestra la etiqueta de la opción vacía como valor seleccionado', async () => {
    await mountSelect();
    expect(wrapper!.find<HTMLInputElement>('.ui-select-input').element.value).toBe('Todos');
  });

  it('abre el listado al pulsar y emite el valor elegido', async () => {
    await mountSelect();
    await openSelect();

    expect(document.querySelector('.ui-select-content')).not.toBeNull();

    const active = visibleOptions().find((option) => option.textContent?.includes('Activo'));
    active!.click();
    await nextTick();
    await nextTick();

    expect(wrapper!.emitted('update:modelValue')).toContainEqual(['active']);
  });

  it('expone el patrón combobox y etiquetas accesibles', async () => {
    await mountSelect({ label: 'Estado', ariaLabel: 'Filtrar por estado' });
    const input = wrapper!.find('.ui-select-input');
    const trigger = wrapper!.find('.ui-select-chevron');

    expect(input.attributes('role')).toBe('combobox');
    expect(input.attributes('id')).toBe(wrapper!.find('label').attributes('for'));
    expect(trigger.attributes('aria-label')).toBe('Mostrar opciones');
  });

  it('abre con ArrowDown desde el teclado', async () => {
    await mountSelect();
    await wrapper!.find('.ui-select-input').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    await nextTick();

    expect(visibleOptions().length).toBeGreaterThan(0);
  });

  it('filtra sin distinguir acentos ni mayúsculas', async () => {
    await mountSelect({ searchable: true });
    await openSelect();

    const input = wrapper!.find<HTMLInputElement>('.ui-select-input');
    input.element.value = 'mexico';
    await input.trigger('input');
    await nextTick();
    await nextTick();

    const labels = visibleOptions().map((option) => option.textContent?.trim());
    expect(labels.some((label) => label?.includes('Ciudad de México'))).toBe(true);
    expect(labels.some((label) => label?.includes('Activo'))).toBe(false);
  });

  it('busca por descripción y agrupa las opciones', async () => {
    await mountSelect({ searchable: true });
    await openSelect();

    expect(
      Array.from(document.querySelectorAll('.ui-select-group-label')).map((label) =>
        label.textContent?.trim(),
      ),
    ).toContain('Norteamérica');

    const input = wrapper!.find<HTMLInputElement>('.ui-select-input');
    input.element.value = 'GMT-5';
    await input.trigger('input');
    await nextTick();
    await nextTick();

    expect(
      visibleOptions().some((option) => option.textContent?.includes('Bogotá')),
    ).toBe(true);
  });

  it('limpia la selección sin limpiar si es obligatorio', async () => {
    await mountSelect({ modelValue: 'active' });
    expect(wrapper!.find('.ui-select-clear').exists()).toBe(true);

    await wrapper!.find('.ui-select-clear').trigger('click');
    expect(wrapper!.emitted('update:modelValue')).toContainEqual(['']);
  });

  it('no muestra limpiar cuando el campo es obligatorio', async () => {
    await mountSelect({ modelValue: 'active', required: true });
    expect(wrapper!.find('.ui-select-clear').exists()).toBe(false);
  });

  it('muestra un estado vacío cuando la búsqueda no tiene coincidencias', async () => {
    await mountSelect({ searchable: true });
    await openSelect();

    const input = wrapper!.find<HTMLInputElement>('.ui-select-input');
    input.element.value = 'zzzz';
    await input.trigger('input');
    await nextTick();
    await nextTick();

    expect(document.querySelector('.ui-select-empty')?.textContent?.trim()).toBe('Sin resultados');
  });
});

describe('UiMultiSelect', () => {
  const mountMulti = async (modelValue: Array<string | number> = []) => {
    wrapper = mount(UiMultiSelect, {
      props: { options, modelValue },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper;
  };

  it('acumula valores y muestra chips', async () => {
    await mountMulti();
    await openSelect();

    visibleOptions().find((option) => option.textContent?.includes('Activo'))!.click();
    await nextTick();
    await nextTick();
    visibleOptions().find((option) => option.textContent?.includes('Suspendido'))!.click();
    await nextTick();
    await nextTick();

    expect(wrapper!.emitted('update:modelValue')).toContainEqual([['active']]);
    expect(wrapper!.emitted('update:modelValue')).toContainEqual([
      ['active', 'suspended'],
    ]);
  });

  it('quita un chip individual', async () => {
    await mountMulti(['active', 'suspended']);
    const remove = wrapper!.findAll('.ui-select-chip-remove')[0];
    await remove!.trigger('click');

    expect(wrapper!.emitted('update:modelValue')).toContainEqual([['suspended']]);
  });

  it('resume los chips que no caben', async () => {
    await mountMulti(['active', 'suspended', 'bogota']);
    expect(wrapper!.find('.ui-select-chip-more').text()).toBe('+1');
  });
});
