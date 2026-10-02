import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CommandPalette from '@/components/CommandPalette.vue';

const push = vi.fn();
const logout = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
    logout,
  }),
}));

vi.mock('@/composables/useCompanyPath', () => ({
  useCompanyPath: () => ({ companyPath: (p: string) => `/acme${p}` }),
}));

let wrapper: VueWrapper | null = null;

const openPalette = async (modelValue = true) => {
  wrapper = mount(CommandPalette, {
    props: { modelValue },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

const input = () => document.querySelector<HTMLInputElement>('.palette-input');
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
const press = async (key: string) => {
  input()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await nextTick();
};

beforeEach(() => {
  push.mockClear();
  logout.mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('CommandPalette', () => {
  it('no renderiza nada si está cerrado', async () => {
    await openPalette(false);
    expect(document.querySelector('.palette')).toBeNull();
  });

  it('el buscador es un combobox que controla la lista', async () => {
    await openPalette();
    const field = input();
    expect(field?.getAttribute('role')).toBe('combobox');
    expect(field?.getAttribute('aria-controls')).toBe('palette-listbox');
    expect(field?.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('aria-activedescendant apunta a la opción activa', async () => {
    await openPalette();
    const first = options()[0];
    expect(first?.id).toBeTruthy();
    expect(input()?.getAttribute('aria-activedescendant')).toBe(first?.id);
  });

  it('las flechas mueven la opción activa y actualiza aria-activedescendant', async () => {
    await openPalette();
    const second = options()[1];

    await press('ArrowDown');

    expect(second?.getAttribute('aria-selected')).toBe('true');
    expect(input()?.getAttribute('aria-activedescendant')).toBe(second?.id);
  });

  it('el foco real permanece en el input al navegar', async () => {
    await openPalette();
    await press('ArrowDown');
    // El foco no se mueve al option: eso es lo que hace válido el combobox.
    expect(document.activeElement).toBe(input());
  });

  it('ArrowUp no baja de la primera opción', async () => {
    await openPalette();
    await press('ArrowUp');
    expect(options()[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter ejecuta la opción activa', async () => {
    await openPalette();
    await press('ArrowDown');
    await press('Enter');

    expect(push).toHaveBeenCalledWith('/acme/members');
  });

  it('filtra por etiqueta y por sugerencia', async () => {
    await openPalette();
    input()!.value = 'sedes';
    input()!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    // "Sedes" (navegación) + "Nueva sede" (acción rápida): ambas matchean.
    expect(options()).toHaveLength(2);
    expect(options()[0]?.textContent).toContain('Sedes');
    expect(options()[1]?.textContent).toContain('Nueva sede');
  });

  it('las acciones rápidas navegan con query crear=1', async () => {
    await openPalette();
    input()!.value = 'nueva sede';
    input()!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(options()).toHaveLength(1);
    await press('Enter');

    expect(push).toHaveBeenCalledWith({
      path: expect.stringContaining('/branches'),
      query: { crear: '1' },
    });
  });

  it('avisa cuando no hay resultados', async () => {
    await openPalette();
    const field = input()!;
    field.value = 'zzzz';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(document.querySelector('.palette-empty')).not.toBeNull();
    expect(input()?.getAttribute('aria-activedescendant')).toBe('');
  });

  it('Escape cierra y devuelve el foco a donde estaba', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    await openPalette();
    await press('Escape');
    // El componente es controlado: el padre propaga el v-model.
    await wrapper!.setProps({ modelValue: false });

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('Tab cicla dentro del diálogo', async () => {
    await openPalette();
    const dialog = document.querySelector<HTMLElement>('.palette')!;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();

    last!.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
  });

  it('ejecutar una opción cierra el diálogo antes de navegar', async () => {
    await openPalette();
    const firstOption = options()[0];
    expect(firstOption).toBeDefined();

    firstOption!.click();
    await nextTick();

    expect(wrapper!.emitted('update:modelValue')).toEqual([[false]]);
    expect(push).toHaveBeenCalled();
  });
});
