import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiDataTable, { type TableColumn } from '@/components/ui/UiDataTable.vue';

const columns: TableColumn[] = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'score', label: 'Puntos', sortable: true },
  { key: 'actions', label: '', align: 'right' },
];

const rows = [
  { id: 1, name: 'Zoe', role: 'Editor', score: 10 },
  { id: 2, name: 'Ana', role: 'Admin', score: 200 },
  { id: 3, name: 'Milo', role: 'Viewer', score: 30 },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountTable = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiDataTable, {
    props: { columns, rows, ...props },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const bodyTexts = () =>
  Array.from(document.querySelectorAll('tbody tr')).map(
    (tr) => tr.querySelector('td')?.textContent?.trim() ?? '',
  );

const sortButtons = () => document.querySelectorAll<HTMLButtonElement>('.ui-table-sort');
const headerOf = (label: string) =>
  Array.from(document.querySelectorAll('th')).find((th) =>
    th.textContent?.includes(label),
  );

describe('UiDataTable — ordenamiento', () => {
  it('sin `sortable` no muestra controles de orden', async () => {
    await mountTable();
    expect(sortButtons()).toHaveLength(0);
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBeNull();
  });

  it('ordena ascendente y descendente al pulsar dos veces', async () => {
    await mountTable({ sortable: true, sortKey: 'name', sortDir: 'asc' });
    expect(bodyTexts()).toEqual(['Ana', 'Milo', 'Zoe']);

    await wrapper!.setProps({ sortDir: 'desc' });
    expect(bodyTexts()).toEqual(['Zoe', 'Milo', 'Ana']);
  });

  it('ordena números de forma numérica, no textual', async () => {
    await mountTable({ sortable: true, sortKey: 'score', sortDir: 'asc' });
    // '10','200','30' como texto daría 10, 200, 30; numéricamente 10, 30, 200.
    expect(bodyTexts()).toEqual(['Zoe', 'Milo', 'Ana']);
  });

  it('no muta el array original de filas', async () => {
    const original = [...rows];
    await mountTable({ sortable: true, sortKey: 'score', sortDir: 'asc' });
    expect(rows).toEqual(original);
  });

  it('expone aria-sort y lo cambia de ascendente a descendente', async () => {
    await mountTable({ sortable: true, sortKey: 'name', sortDir: 'asc' });
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBe('ascending');

    await wrapper!.setProps({ sortDir: 'desc' });
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBe('descending');
    expect(headerOf('Rol')?.getAttribute('aria-sort')).toBe('none');
  });

  it('emit sortKey y sortDir al pulsar un encabezado por primera vez', async () => {
    await mountTable({ sortable: true });
    sortButtons()[0]?.click();
    await nextTick();

    expect(wrapper!.emitted('update:sortKey')).toEqual([['name']]);
    expect(wrapper!.emitted('update:sortDir')).toEqual([['asc']]);
  });

  it('invierte la dirección si se pulsa la columna ya activa', async () => {
    await mountTable({ sortable: true, sortKey: 'name', sortDir: 'asc' });
    sortButtons()[0]?.click();
    await nextTick();

    expect(wrapper!.emitted('update:sortKey')).toBeUndefined();
    expect(wrapper!.emitted('update:sortDir')).toEqual([['desc']]);
  });

  it('usa sortAccessor cuando la celda no es texto plano', async () => {
    const boolColumns: TableColumn[] = [
      { key: 'active', label: 'Activo', sortable: true, sortAccessor: (r: any) => (r.active ? 1 : 0) },
    ];
    await mountTable({
      columns: boolColumns,
      rows: [
        { id: 1, name: 'b', active: true },
        { id: 2, name: 'a', active: false },
      ],
      sortable: true,
      sortKey: 'active',
      sortDir: 'asc',
    });
    // false (0) antes que true (1), no por orden alfabético.
    expect(bodyTexts()).toEqual(['false', 'true']);

    await wrapper!.setProps({ sortDir: 'desc' });
    expect(bodyTexts()).toEqual(['true', 'false']);
  });
});

describe('UiDataTable — estructura', () => {
  it('cada celda lleva la etiqueta de su columna para las tarjetas móviles', async () => {
    await mountTable();
    const cells = document.querySelectorAll('tbody tr:first-child td');
    expect(cells[0]?.getAttribute('data-label')).toBe('Nombre');
    expect(cells[1]?.getAttribute('data-label')).toBe('Rol');
  });

  it('sticky es opcional y añade la clase de scroll interno', async () => {
    await mountTable();
    expect(document.querySelector('.table-scroll')).toBeNull();
    expect(document.querySelector('.ui-table.is-sticky')).toBeNull();

    await wrapper!.setProps({ sticky: true });
    expect(document.querySelector('.table-scroll')).not.toBeNull();
    expect(document.querySelector('.ui-table.is-sticky')).not.toBeNull();
  });

  it('mantiene los estados de loading, error y vacío', async () => {
    await mountTable({ loading: true, columns: columns.slice(0, 2) });
    expect(document.querySelectorAll('.skeleton-row')).toHaveLength(5);
    expect(document.querySelector('[role="status"]')).not.toBeNull();

    await wrapper!.setProps({ loading: false, rows: [] });
    expect(document.querySelector('.empty-state')).not.toBeNull();

    await wrapper!.setProps({ error: 'Fallo de red' });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Fallo de red');
  });

  it('el botón de reintentar dispara el evento retry', async () => {
    await mountTable({ rows: [], error: 'Fallo de red', onRetry: () => {} });
    const retry = document.querySelector<HTMLButtonElement>('.empty-state button');
    retry?.click();
    await nextTick();

    expect(wrapper!.emitted('retry')).toHaveLength(1);
  });
});
