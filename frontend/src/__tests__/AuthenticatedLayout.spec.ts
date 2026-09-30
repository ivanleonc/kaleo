import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import { useAuthStore } from '@/stores/auth.store';

const { mockPush, mockRoute } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRoute: {
    path: '/companies/acme/members',
    name: 'Members' as string | undefined,
    params: { companyId: 'acme' },
    query: {},
    hash: '',
  },
}));

// Simula haber aterrizado ya en la nueva empresa con su slug canónico,
// así el bloque de reconciliación del layout no dispara un segundo push.
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    // El router real devuelve una promesa: el layout encadena `.catch()`.
    push: (to: unknown) => {
      mockPush(to);
      return Promise.resolve();
    },
    currentRoute: { value: { ...mockRoute, params: { companyId: 'globex' } } },
  }),
}));

// El dropdown teletransporta su menú: en el test basta con el contenido inline.
const UiDropdownStub = {
  template: `<div><slot name="trigger" :open="false" :toggle="noop" :close="noop" :trigger-aria="{}" /><slot :close="noop" /></div>`,
  methods: { noop() {} },
};

let wrapper: VueWrapper | null = null;

const setRoute = (path: string, name: string | undefined) => {
  mockRoute.path = path;
  mockRoute.name = name;
};

const mountLayout = async () => {
  wrapper = mount(AuthenticatedLayout, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        UiDropdown: UiDropdownStub,
        CommandPalette: { template: '<div />' },
        UiModal: { template: '<div><slot /></div>' },
      },
      directives: { permission: {} },
    },
    slots: { default: '<div>vista</div>' },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
};

const clickTenant = async (name: string) => {
  const btn = wrapper!
    .findAll('button.dropdown-item')
    .find((b) => b.text().trim() === name);
  expect(btn, `botón de empresa "${name}"`).toBeDefined();
  await btn!.trigger('click');
  await flushPromises();
  await flushPromises();
};

const seedAuth = () => {
  const authStore = useAuthStore();
  authStore.user = {
    id: 'user-1',
    name: 'Iván',
    email: 'ivan@acme.co',
    tenants: [
      { id: 'uuid-a', name: 'Acme', slug: 'acme' },
      { id: 'uuid-b', name: 'Globex', slug: 'globex' },
    ],
  } as any;
  authStore.activeTenantId = 'uuid-a';
  // El cambio real hace refresh de tokens + perfil: aquí no hay red.
  vi.spyOn(authStore, 'refreshTokens').mockResolvedValue(true);
  vi.spyOn(authStore, 'fetchProfile').mockResolvedValue(undefined as never);
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockPush.mockReset();
  seedAuth();
  setRoute('/companies/acme/members', 'Members');
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('AuthenticatedLayout — cambio de empresa conserva la sección', () => {
  it('en Miembros, cambia a la misma sección de la otra empresa', async () => {
    await mountLayout();
    await clickTenant('Globex');

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      path: '/companies/globex/members',
      query: {},
      hash: '',
    });
    expect(useAuthStore().activeTenantId).toBe('uuid-b');
  });

  it('en una sección con gate (Audit) también preserva: el guard decide la caída', async () => {
    setRoute('/companies/acme/audit', 'Audit');
    await mountLayout();
    await clickTenant('Globex');

    // El layout no decide permisos; solo conserva la ruta. Si la nueva
    // empresa carece del permiso, el guard redirige al Panel (ya cubierto).
    expect(mockPush).toHaveBeenCalledWith({
      path: '/companies/globex/audit',
      query: {},
      hash: '',
    });
  });

  it('en ruta desconocida cae al Panel de la nueva empresa', async () => {
    setRoute('/empresas/desconocida', 'NotFound');
    await mountLayout();
    await clickTenant('Globex');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/companies/globex/dashboard',
      query: {},
      hash: '',
    });
  });

  it('clic en la empresa activa no navega', async () => {
    await mountLayout();
    await clickTenant('Acme');

    expect(mockPush).not.toHaveBeenCalled();
  });
});
