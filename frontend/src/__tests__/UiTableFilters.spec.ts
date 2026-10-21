import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import UiTableFilters, { type TableFilterDef } from '@/components/ui/UiTableFilters.vue';

const defs: TableFilterDef[] = [
  { key: 'search', type: 'search', label: 'Buscar miembros', placeholder: 'Buscar por nombre...', grow: true },
  {
    key: 'status',
    type: 'select',
    label: 'Filtrar por estado',
    options: [
      { label: 'Todos', value: '' },
      { label: 'Activo', value: 'active' },
    ],
  },
  { key: 'from', type: 'date', label: 'Desde' },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountFilters = async (
  modelValue: Record<string, string> = {},
  slots: Record<string, (...args: any[]) => any> = {},
) => {
  wrapper = mount(UiTableFilters, {
    props: { filters: defs, modelValue },
    slots,
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const emittedValues = () =>
  (wrapper!.emitted('update:modelValue') ?? []).map((args) => args[0]);

const openSelect = async (label: string) => {
  const input = document.querySelector<HTMLInputElement>(
    `.filters-bar [role="combobox"][aria-label="${label}"]`,
  );
  input!.click();
  await nextTick();
  await nextTick();
};

const chooseOption = async (label: string) => {
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (item) => item.textContent?.trim() === label,
  );
  option!.click();
  await nextTick();
  await nextTick();
};

describe('UiTableFilters', () => {
  it('renderiza un control por definición con sus etiquetas', async () => {
    await mountFilters();
    expect(document.querySelector('.filters-bar input[type="text"]')).not.toBeNull();
    expect(document.querySelectorAll('.filters-bar [role="combobox"]')).toHaveLength(1);
    expect(document.querySelector('input[type="date"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Filtrar por estado"]')).not.toBeNull();
  });

  it('no renderiza nada sin definiciones', async () => {
    wrapper = mount(UiTableFilters, {
      props: { filters: [], modelValue: {} },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.querySelector('.filters-bar')).toBeNull();
  });

  it('el buscador emite el texto al v-model', async () => {
    await mountFilters();
    const search = document.querySelector<HTMLInputElement>('.filters-bar input');
    search!.value = 'ana';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(emittedValues()).toContainEqual(expect.objectContaining({ search: 'ana' }));
  });

  it('el select emite el valor elegido', async () => {
    await mountFilters();
    await openSelect('Filtrar por estado');
    await chooseOption('Activo');

    expect(emittedValues()).toContainEqual(expect.objectContaining({ status: 'active' }));
  });

  it('el date emite la fecha elegida', async () => {
    await mountFilters();
    const date = document.querySelector<HTMLInputElement>('input[type="date"]');
    date!.value = '2026-01-15';
    date!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(emittedValues()).toContainEqual(expect.objectContaining({ from: '2026-01-15' }));
  });

  it('Limpiar solo aparece con filtros activos y resetea todo', async () => {
    await mountFilters({ search: '', status: '', from: '' });
    expect(document.querySelector('.clear-btn')).toBeNull();

    await wrapper!.setProps({ modelValue: { search: 'ana', status: 'active', from: '' } });
    const clear = document.querySelector<HTMLButtonElement>('.clear-btn');
    expect(clear).not.toBeNull();

    clear!.click();
    await nextTick();
    expect(emittedValues()).toContainEqual({ search: '', status: '', from: '' });
  });

  it('muestra chips con la etiqueta visible de cada filtro', async () => {
    await mountFilters({ search: 'ana', status: 'active', from: '2026-01-15' });

    const chips = Array.from(document.querySelectorAll('.filter-chip'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      '"ana"Quitar búsqueda',
      'ActivoQuitar filtro filtrar por estado',
      '2026-01-15Quitar filtro desde',
    ]);
  });

  it('un chip elimina solo su filtro', async () => {
    await mountFilters({ search: 'ana', status: 'active', from: '' });

    document.querySelectorAll<HTMLButtonElement>('.filter-chip')[1]?.click();
    await nextTick();

    expect(emittedValues()).toContainEqual({ search: 'ana', status: '', from: '' });
  });

  it('permite ocultar los chips', async () => {
    wrapper = mount(UiTableFilters, {
      props: {
        filters: defs,
        modelValue: { search: 'ana', status: '', from: '' },
        showActiveFilters: false,
      },
    });
    await nextTick();

    expect(document.querySelector('.filter-chip')).toBeNull();
  });

  it('el slot #filter-{key} reemplaza el control estándar', async () => {
    await mountFilters(
      {},
      { 'filter-status': () => h('button', { class: 'custom-filter' }, 'Especial') },
    );
    expect(document.querySelector('.custom-filter')).not.toBeNull();
    expect(document.querySelectorAll('.filters-bar [role="combobox"]')).toHaveLength(0);
  });
});
