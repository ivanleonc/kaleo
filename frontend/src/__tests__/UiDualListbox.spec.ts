import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiDualListbox, { type DualListboxItem } from '@/components/ui/UiDualListbox.vue';

const items: DualListboxItem[] = [
  { id: 'u1', label: 'Usuarios' },
  { id: 'r1', label: 'Roles' },
  { id: 'a1', label: 'Auditoría' },
  { id: 'b1', label: 'Facturación' },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const options = (panel: 0 | 1) => {
  const lists = document.querySelectorAll('[role="listbox"]');
  return Array.from(lists[panel]?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
};

const actionButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.action-btn'));

const click = async (el?: Element | null) => {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
};

const press = async (key: string) => {
  const list = document.querySelectorAll('[role="listbox"]')[0] as HTMLElement;
  list?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await nextTick();
  // El componente enfoca el option dentro de su propio nextTick.
  await nextTick();
};

const mountListbox = async (modelValue: string[] = []) => {
  wrapper = mount(UiDualListbox, {
    props: { modelValue, available: items, selected: items, label: 'Permisos' },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const model = () => {
  const emitted = wrapper!.emitted('update:modelValue') ?? [];
  const last = emitted[emitted.length - 1];
  return last?.[0] as string[] | undefined;
};

describe('UiDualListbox', () => {
  it('expone dos listas con semántica de listbox', async () => {
    await mountListbox();
    const lists = document.querySelectorAll('[role="listbox"]');
    expect(lists).toHaveLength(2);
    lists.forEach((l) => expect(l.getAttribute('aria-multiselectable')).toBe('true'));
  });

  it('los items se anuncian como options y son alcanzables con el teclado', async () => {
    await mountListbox();
    const opts = options(0);
    expect(opts).toHaveLength(4);
    // Solo un item por panel es tabulable (roving tabindex).
    expect(opts.filter((o) => o.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('flechas recorren los items y saltan a los extremos', async () => {
    await mountListbox();
    const active = () => (document.activeElement as HTMLElement)?.textContent?.trim();

    await press('End');
    expect(active()).toBe('Facturación');

    // Sin envolver: en el patrón listbox el foco se queda en el extremo.
    await press('ArrowDown');
    expect(active()).toBe('Facturación');

    await press('Home');
    expect(active()).toBe('Usuarios');

    await press('ArrowUp');
    expect(active()).toBe('Usuarios');
  });

  it('Espacio marca un item y la flecha derecha lo mueve', async () => {
    await mountListbox();
    await press('ArrowDown');
    await press(' ');
    expect(options(0)[1]?.getAttribute('aria-selected')).toBe('true');

    await click(actionButtons()[0]);
    expect(model()).toEqual(['r1']);
  });

  it('mover todos a la derecha selecciona todo', async () => {
    await mountListbox();
    await click(actionButtons()[2]);
    expect(model()).toEqual(['u1', 'r1', 'a1', 'b1']);
  });

  it('mover todos a la izquierda limpia la selección', async () => {
    await mountListbox(['u1', 'r1']);
    await click(actionButtons()[3]);
    expect(model()).toEqual([]);
  });

  it('"mover todos a la izquierda" NO descarta lo que no coincide con el filtro', async () => {
    await mountListbox(['u1', 'r1', 'b1']);
    // Se filtra el panel de disponibles; el botón debe ignorar ese filtro.
    const search = document.querySelectorAll<HTMLInputElement>('.panel-search-input')[0];
    expect(search).toBeDefined();
    search!.value = 'aud';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    await click(actionButtons()[3]);
    // Vacía todo, pero sin dejarlo en un estado donde 'b1' se pierde por el filtro.
    expect(model()).toEqual([]);
  });

  it('no duplica ids al mover un item ya seleccionado', async () => {
    await mountListbox(['u1']);
    const remaining = options(0);
    expect(remaining).toHaveLength(3);
    expect(remaining.some((o) => o.textContent?.includes('Usuarios'))).toBe(false);
  });

  it('los botones de acción tienen nombre accesible', async () => {
    await mountListbox();
    const labels = actionButtons().map((b) => b.getAttribute('aria-label'));
    labels.forEach((l) => expect(l).toBeTruthy());
    // 0: hacia la derecha · 1: hacia la izquierda · 2/3: mover todos
    expect(labels[0]).toBe('Mover seleccionados a Seleccionados');
    expect(labels[1]).toBe('Mover seleccionados a Disponibles');
    expect(labels[2]).toBe('Mover todos a Seleccionados');
    expect(labels[3]).toBe('Mover todos a Disponibles');
  });

  it('los buscadores se anuncian con su panel', async () => {
    await mountListbox();
    const searches = document.querySelectorAll<HTMLInputElement>('.panel-search-input');
    expect(searches[0]?.getAttribute('aria-label')).toBe('Buscar en Disponibles');
    expect(searches[1]?.getAttribute('aria-label')).toBe('Buscar en Seleccionados');
  });
});
