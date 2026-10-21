import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiTableColumnMenu from '@/components/ui/UiTableColumnMenu.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

interface FakeColumn {
  id: string;
  label: string;
  visible: boolean;
  canHide: boolean;
}

function createTable(columns: FakeColumn[]) {
  return {
    getAllLeafColumns: () =>
      columns.map((column) => ({
        id: column.id,
        columnDef: { meta: { label: column.label } },
        getCanHide: () => column.canHide,
        getIsVisible: () => column.visible,
        toggleVisibility: (value?: boolean) => {
          column.visible = value ?? !column.visible;
        },
      })),
    getColumn: (columnId: string) => {
      const column = columns.find((item) => item.id === columnId);
      if (!column) return undefined;
      return {
        id: column.id,
        columnDef: { meta: { label: column.label } },
        getCanHide: () => column.canHide,
        getIsVisible: () => column.visible,
        toggleVisibility: (value?: boolean) => {
          column.visible = value ?? !column.visible;
        },
      };
    },
  };
}

const mountMenu = async (columns: FakeColumn[]) => {
  wrapper = mount(UiTableColumnMenu, {
    props: { table: createTable(columns) as never },
    attachTo: document.body,
  });
  await nextTick();

  const trigger = wrapper.find('button');
  await trigger.trigger('click');
  await nextTick();
  await nextTick();
};

const items = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'));

describe('UiTableColumnMenu', () => {
  it('lista las columnas ocultables con su estado', async () => {
    await mountMenu([
      { id: 'name', label: 'Nombre', visible: true, canHide: true },
      { id: 'email', label: 'Email', visible: false, canHide: true },
      { id: 'actions', label: '', visible: true, canHide: false },
    ]);

    const options = items();
    expect(options).toHaveLength(2);
    expect(options[0]?.getAttribute('aria-checked')).toBe('true');
    expect(options[1]?.getAttribute('aria-checked')).toBe('false');
    expect(options[0]?.textContent).toContain('Nombre');
  });

  it('alterna la visibilidad de una columna', async () => {
    const columns: FakeColumn[] = [
      { id: 'name', label: 'Nombre', visible: true, canHide: true },
      { id: 'email', label: 'Email', visible: true, canHide: true },
    ];
    await mountMenu(columns);

    items()[1]?.click();
    await nextTick();

    expect(columns[1]?.visible).toBe(false);
  });

  it('no deja ocultar la última columna visible', async () => {
    const columns: FakeColumn[] = [
      { id: 'name', label: 'Nombre', visible: true, canHide: true },
    ];
    await mountMenu(columns);

    const only = items()[0];
    expect(only?.hasAttribute('disabled')).toBe(true);
    only?.click();
    await nextTick();

    expect(columns[0]?.visible).toBe(true);
  });

  it('"Mostrar todas" vuelve a mostrar las columnas ocultas', async () => {
    const columns: FakeColumn[] = [
      { id: 'name', label: 'Nombre', visible: true, canHide: true },
      { id: 'email', label: 'Email', visible: false, canHide: true },
    ];
    await mountMenu(columns);

    const showAll = document.querySelector<HTMLButtonElement>('[role="menuitem"]');
    showAll?.click();
    await nextTick();

    expect(columns[1]?.visible).toBe(true);
  });
});
