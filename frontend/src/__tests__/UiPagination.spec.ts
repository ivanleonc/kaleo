import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiPagination from '@/components/ui/UiPagination.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const mountPagination = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(UiPagination, { props, attachTo: document.body });
  await nextTick();
  return wrapper;
};

const pageNumbers = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.page-number')).map((b) =>
    Number(b.textContent?.trim()),
  );

const gaps = () => document.querySelectorAll('.page-gap').length;

describe('UiPagination', () => {
  it('se oculta con una sola página si no se pide selector de tamaño', async () => {
    await mountPagination({ page: 1, total: 5, limit: 20 });
    expect(document.querySelector('.pagination')).toBeNull();
  });

  it('calcula las páginas totales a partir del total y el límite', async () => {
    await mountPagination({ page: 1, total: 45, limit: 20 });
    expect(pageNumbers()).toEqual([1, 2, 3]);
  });

  it('marca la página actual con aria-current', async () => {
    await mountPagination({ page: 2, total: 100, limit: 20 });
    const active = document.querySelector('[aria-current="page"]');
    expect(active?.textContent?.trim()).toBe('2');
  });

  it('emite la página al pulsar un número', async () => {
    await mountPagination({ page: 1, total: 100, limit: 20 });
    document.querySelectorAll<HTMLButtonElement>('.page-number')[2]?.click();
    await nextTick();
    expect(wrapper!.emitted('update:page')).toEqual([[3]]);
  });

  it('deshabilita Anterior en la primera y Siguiente en la última', async () => {
    await mountPagination({ page: 1, total: 100, limit: 20 });
    const [prev, next] = Array.from(document.querySelectorAll<HTMLButtonElement>('.page-btn'));
    expect(prev?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);

    await wrapper!.setProps({ page: 5 });
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.page-btn'));
    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(true);
  });

  it('resume con elipsis las páginas lejanas', async () => {
    await mountPagination({ page: 10, total: 400, limit: 20 });
    const pages = pageNumbers();
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
    expect(gaps()).toBe(2);
  });

  it('no muestra elipsis si la ventana cabe entera', async () => {
    await mountPagination({ page: 1, total: 100, limit: 20 });
    expect(gaps()).toBe(0);
  });

  it('muestra el rango y el total', async () => {
    await mountPagination({ page: 2, total: 45, limit: 20 });
    expect(document.querySelector('.page-summary')?.textContent).toContain('21');
    expect(document.querySelector('.page-summary')?.textContent).toContain('45');
  });

  it('el selector de filas por página está oculto por defecto', async () => {
    await mountPagination({ page: 1, total: 100, limit: 20 });
    expect(document.querySelector('.page-size-select')).toBeNull();
  });

  it('el selector emite el límite y vuelve a la primera página', async () => {
    await mountPagination({ page: 4, total: 400, limit: 20, showPageSize: true });
    const select = document.querySelector<HTMLSelectElement>('.page-size-select');
    expect(select).not.toBeNull();

    select!.value = '50';
    select!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(wrapper!.emitted('update:limit')).toEqual([[50]]);
    // Sin volver a la 1 el usuario caería en una página vacía.
    expect(wrapper!.emitted('update:page')).toEqual([[1]]);
  });

  it('el selector de filas sigue visible con una sola página', async () => {
    await mountPagination({ page: 1, total: 5, limit: 20, showPageSize: true });
    expect(document.querySelector('.pagination')).not.toBeNull();
    expect(document.querySelector('.page-nav')).toBeNull();
  });
});
