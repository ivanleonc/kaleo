import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MembersView from '@/views/MembersView.vue';
import { useAuthStore } from '@/stores/auth.store';

const { mockGetMembers, mockGetRoles, mockPush } = vi.hoisted(() => ({
  mockGetMembers: vi.fn(),
  mockGetRoles: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/services/member.service', () => ({
  memberService: {
    getMembers: mockGetMembers,
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/services/role.service', () => ({
  roleService: { getRoles: mockGetRoles },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { companyId: 'company-1' },
    path: '/companies/company-1/members',
    query: {},
  }),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const IVAN = {
  id: 'u-1',
  name: 'Iván Capote',
  email: 'idzivan@unimayor.edu.co',
  roles: ['Owner'],
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
};

const ROLES = [
  { id: 'role-owner', name: 'Owner', description: '', company_id: null, permissions: [] },
  { id: 'role-viewer', name: 'Viewer', description: '', company_id: null, permissions: [] },
];

const pageOf = (data: unknown[], total = data.length) => ({
  success: true,
  data,
  total,
  page: 1,
  limit: 20,
});

let wrapper: VueWrapper | null = null;

const mountView = async () => {
  wrapper = mount(MembersView, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
      directives: { permission: {} },
    },
    attachTo: document.body,
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
};

const filterSelects = () => wrapper!.find('.filters-bar').findAll('select');
const bodyText = () => document.querySelector('tbody')?.textContent ?? '';

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createPinia());
  mockGetMembers.mockReset();
  mockGetRoles.mockReset();
  mockPush.mockClear();

  mockGetMembers.mockResolvedValue(pageOf([{ ...IVAN }]));
  mockGetRoles.mockResolvedValue(ROLES.map((r) => ({ ...r })));

  const authStore = useAuthStore();
  authStore.user = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@acme.co',
    tenants: [{ id: 'company-1', name: 'Acme', slug: 'acme' }],
  } as any;
  authStore.activeTenantId = 'company-1';
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('MembersView — cadena de datos (regresión)', () => {
  it('muestra las filas cuando el fetch resuelve después del mount', async () => {
    await mountView();

    // El bug reportado: la tabla nacía congelada con [] y jamás mostraba
    // lo que traía el fetch (solo aparecía al remontar cambiando de pestaña).
    expect(mockGetMembers).toHaveBeenCalled();
    expect(bodyText()).toContain('Iván Capote');
    expect(document.querySelector('.empty-state')).toBeNull();
  });

  it('filtrar por rol pide la página 1 con el roleId y actualiza la tabla', async () => {
    await mountView();
    mockGetMembers.mockClear();
    mockGetMembers.mockResolvedValue(pageOf([], 0));

    await filterSelects()[0]?.setValue('role-viewer');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(mockGetMembers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, roleId: 'role-viewer' }),
    );
    expect(document.querySelector('.empty-state')).not.toBeNull();
    expect(bodyText()).not.toContain('Iván Capote');
  });

  it('filtrar por estado envía el status al servidor', async () => {
    await mountView();
    mockGetMembers.mockClear();

    await filterSelects()[1]?.setValue('inactive');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(mockGetMembers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, status: 'inactive' }),
    );
  });

  it('ordenar por encabezado pide sort server-side y reordena al llegar', async () => {
    await mountView();
    mockGetMembers.mockClear();
    mockGetMembers.mockResolvedValue(
      pageOf([
        { ...IVAN, id: 'u-2', name: 'Ana', email: 'ana@acme.co' },
        { ...IVAN },
      ]),
    );

    document.querySelectorAll<HTMLButtonElement>('.ui-table-sort')[0]?.click();
    await flushPromises();

    expect(mockGetMembers).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'name', sortDir: 'asc' }),
    );
    expect(bodyText().indexOf('Ana')).toBeLessThan(bodyText().indexOf('Iván'));
  });

  it('un refetch fallido avisa en vez de dejar filas viejas en silencio', async () => {
    await mountView();
    expect(bodyText()).toContain('Iván Capote');

    mockGetMembers.mockRejectedValueOnce(new Error('Network Error'));
    await filterSelects()[1]?.setValue('inactive');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    // Las filas viejas siguen ahí, pero el error ya es visible.
    expect(bodyText()).toContain('Iván Capote');
    expect(document.querySelector('.ui-table-error-banner')).not.toBeNull();
  });
});
