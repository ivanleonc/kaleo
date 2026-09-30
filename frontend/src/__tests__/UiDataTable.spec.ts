import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, computed, reactive } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import {
  useAppTable,
  createAppColumnHelper,
  useSortingState,
  useControlledSorting,
  type AppColumnDef,
} from '@/composables/useAppTable';
import type { SortingState } from '@tanstack/vue-table';

interface TestRow {
  id: number;
  name: string;
  role: string;
  score: number;
  active?: boolean;
}

const columnHelper = createAppColumnHelper<TestRow>();

const defaultColumns: AppColumnDef<TestRow>[] = [
  columnHelper.accessor('name', { header: 'Nombre', meta: { label: 'Nombre' } }),
  columnHelper.accessor('role', { header: 'Rol', meta: { label: 'Rol' } }),
  columnHelper.accessor('score', { header: 'Puntos', meta: { label: 'Puntos' } }),
  columnHelper.display({ id: 'actions', header: '', meta: { label: '', align: 'right' } }),
];

const baseRows: TestRow[] = [
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

interface MountOptions {
  columns?: AppColumnDef<TestRow>[];
  data?: TestRow[];
  /** Ref externa (simula un fetch que resuelve después del mount). */
  dataRef?: Ref<TestRow[]> | ComputedRef<TestRow[]>;
  props?: Record<string, unknown>;
  slots?: Record<string, (...args: any[]) => any>;
  initialSorting?: SortingState;
  tableOptions?: Record<string, unknown>;
}

const mountTable = async ({
  columns = defaultColumns,
  data = baseRows,
  dataRef,
  props = {},
  slots = {},
  initialSorting = [],
  tableOptions = {},
}: MountOptions = {}) => {
  // Host con template (no `h()`): solo así Vue infiere el genérico TData
  // del presentador igual que en las vistas reales.
  const Host = defineComponent({
    components: { UiDataTable },
    props: { tableProps: { type: Object, default: () => ({}) } },
    setup(hostProps) {
      const sorting = useSortingState(initialSorting);
      const table = useAppTable<TestRow>({
        columns,
        data: dataRef ?? ref(data.map((r) => ({ ...r }))),
        ...useControlledSorting(sorting),
        ...tableOptions,
      });
      const mergedProps = computed(() => ({ ...props, ...hostProps.tableProps }));
      return { table, mergedProps };
    },
    template: `
      <UiDataTable :table="table" v-bind="mergedProps">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </UiDataTable>
    `,
  });
  wrapper = mount(Host, { slots, attachTo: document.body });
  await nextTick();
  return wrapper;
};

const tableComponent = () =>
  wrapper!.findComponent(UiDataTable) as unknown as Pick<VueWrapper, 'emitted'>;

const bodyTexts = () =>
  Array.from(document.querySelectorAll('tbody tr')).map(
    (tr) => tr.querySelector('td')?.textContent?.trim() ?? '',
  );

const sortButtons = () => document.querySelectorAll<HTMLButtonElement>('.ui-table-sort');
const headerOf = (label: string) =>
  Array.from(document.querySelectorAll('th')).find((th) =>
    th.textContent?.includes(label),
  );

describe('UiDataTable — ordenamiento (modo cliente)', () => {
  it('sin columnas sorteables no muestra controles de orden', async () => {
    const plain = defaultColumns.map((c) =>
      c.id === 'actions' ? c : { ...c, enableSorting: false },
    );
    await mountTable({ columns: plain });
    expect(sortButtons()).toHaveLength(0);
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBeNull();
  });

  it('ordena ascendente y descendente al pulsar dos veces', async () => {
    await mountTable({ initialSorting: [{ id: 'name', desc: false }] });
    expect(bodyTexts()).toEqual(['Ana', 'Milo', 'Zoe']);

    sortButtons()[0]?.click();
    await nextTick();
    expect(bodyTexts()).toEqual(['Zoe', 'Milo', 'Ana']);
  });

  it('ordena números de forma numérica, no textual', async () => {
    await mountTable({ initialSorting: [{ id: 'score', desc: false }] });
    // '10','200','30' como texto daría 10, 200, 30; numéricamente 10, 30, 200.
    expect(bodyTexts()).toEqual(['Zoe', 'Milo', 'Ana']);
  });

  it('no muta el array original de filas', async () => {
    const original = baseRows.map((r) => ({ ...r }));
    const snapshot = JSON.stringify(baseRows);
    await mountTable({ initialSorting: [{ id: 'score', desc: false }] });
    expect(JSON.stringify(baseRows)).toBe(snapshot);
    expect(original).toHaveLength(3);
  });

  it('expone aria-sort y lo cambia de ascendente a descendente', async () => {
    await mountTable({ initialSorting: [{ id: 'name', desc: false }] });
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBe('ascending');

    sortButtons()[0]?.click();
    await nextTick();
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBe('descending');
    expect(headerOf('Rol')?.getAttribute('aria-sort')).toBe('none');
  });

  it('el primer clic en un encabezado ordena ascendente', async () => {
    await mountTable();
    expect(bodyTexts()).toEqual(['Zoe', 'Ana', 'Milo']);

    sortButtons()[0]?.click();
    await nextTick();
    expect(bodyTexts()).toEqual(['Ana', 'Milo', 'Zoe']);
    expect(headerOf('Nombre')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('usa el accessor cuando la celda no es texto plano', async () => {
    const boolColumns: AppColumnDef<TestRow>[] = [
      columnHelper.accessor((r) => (r.active ? 1 : 0), {
        id: 'active',
        header: 'Activo',
        meta: { label: 'Activo' },
      }),
    ];
    await mountTable({
      columns: boolColumns,
      data: [
        { id: 1, name: 'b', role: '', score: 0, active: true },
        { id: 2, name: 'a', role: '', score: 0, active: false },
      ],
      initialSorting: [{ id: 'active', desc: false }],
    });
    // false (0) antes que true (1), no por orden alfabético.
    expect(bodyTexts()).toEqual(['0', '1']);

    sortButtons()[0]?.click();
    await nextTick();
    expect(bodyTexts()).toEqual(['1', '0']);
  });
});

describe('UiDataTable — reactividad de datos (regresión)', () => {
  it('reacciona cuando los datos llegan después del mount (fetch async)', async () => {
    const live = ref<TestRow[]>([]);
    await mountTable({ dataRef: live });
    expect(document.querySelector('.empty-state')).not.toBeNull();

    live.value = baseRows.map((r) => ({ ...r }));
    await nextTick();
    await nextTick();

    expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(bodyTexts()[0]).toBe('Zoe');
  });

  it('reacciona con el patrón de la app: computed sobre store reactivo', async () => {
    // Los setup stores de Pinia van en reactive() y desenvuelven los refs:
    // `store.items` es el array pelado, por eso las vistas pasan un computed.
    const fakeStore = reactive({ items: [] as TestRow[] });
    await mountTable({ dataRef: computed(() => fakeStore.items) });
    expect(document.querySelector('.empty-state')).not.toBeNull();

    fakeStore.items = baseRows.map((r) => ({ ...r }));
    await nextTick();
    await nextTick();

    expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('avisa en DEV si `data` no es reactivo (footgun de Pinia)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const fakeStore = reactive({ items: [] as TestRow[] });
      // El array pelado, tal como lo entrega `store.items`: la tabla nace
      // congelada con él y jamás se entera de los reemplazos.
      await mountTable({ dataRef: fakeStore.items as unknown as Ref<TestRow[]> });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[useAppTable]'));

      fakeStore.items = baseRows.map((r) => ({ ...r }));
      await nextTick();
      await nextTick();
      expect(document.querySelectorAll('tbody tr')).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('UiDataTable — estructura', () => {
  it('renderiza celdas custom por slot cell-{id}', async () => {
    await mountTable({
      slots: {
        'cell-name': ({ row }: any) => h('strong', { class: 'custom-name' }, row.name),
        'cell-actions': () => h('button', { class: 'custom-action' }, '⋮'),
      },
    });
    expect(document.querySelectorAll('.custom-name')).toHaveLength(3);
    expect(document.querySelectorAll('.custom-action')).toHaveLength(3);
  });

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

    await wrapper!.setProps({ tableProps: { sticky: true } });
    expect(document.querySelector('.table-scroll')).not.toBeNull();
    expect(document.querySelector('.ui-table.is-sticky')).not.toBeNull();
  });

  it('mantiene los estados de loading, error y vacío', async () => {
    await mountTable({ props: { loading: true } });
    expect(document.querySelectorAll('.skeleton-row')).toHaveLength(5);
    expect(document.querySelector('[role="status"]')).not.toBeNull();

    await wrapper!.setProps({ tableProps: { loading: false, error: null } });
    // Sin datos: el presentador necesita una tabla vacía para el estado vacío.
    await wrapper!.unmount();
    await mountTable({ data: [], props: { loading: false } });
    expect(document.querySelector('.empty-state')).not.toBeNull();

    await wrapper!.unmount();
    await mountTable({ data: [], props: { error: 'Fallo de red' } });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Fallo de red');
  });

  it('el botón de reintentar dispara el evento retry', async () => {
    await mountTable({ data: [], props: { error: 'Fallo de red', onRetry: () => {} } });
    const retry = document.querySelector<HTMLButtonElement>('.empty-state button');
    retry?.click();
    await nextTick();

    expect(tableComponent().emitted('retry')).toHaveLength(1);
  });

  it('muestra un aviso no bloqueante si el refetch falla con filas viejas', async () => {
    await mountTable({ props: { error: 'Se perdió la conexión', onRetry: () => {} } });
    // Las filas viejas siguen visibles…
    expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
    // …pero el error ya no es silencioso.
    const banner = document.querySelector('.ui-table-error-banner');
    expect(banner?.textContent).toContain('Se perdió la conexión');

    banner?.querySelector<HTMLButtonElement>('.ui-table-error-retry')?.click();
    await nextTick();
    expect(tableComponent().emitted('retry')).toHaveLength(1);
  });

  it('el banner no sale sin listener de retry', async () => {
    await mountTable({ props: { error: 'Fallo de red' } });
    expect(document.querySelector('.ui-table-error-banner')).not.toBeNull();
    expect(document.querySelector('.ui-table-error-retry')).toBeNull();
  });
});
