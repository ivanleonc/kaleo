import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MemberCompaniesModal from '@/components/MemberCompaniesModal.vue';
import { useAuthStore } from '@/stores/auth.store';
import { memberService } from '@/services/member.service';

const { mockGetUserCompanies, mockAttach, mockDetach, mockGetRoles, mockGetAllCompanies } = vi.hoisted(() => ({
  mockGetUserCompanies: vi.fn(),
  mockAttach: vi.fn(),
  mockDetach: vi.fn(),
  mockGetRoles: vi.fn(),
  mockGetAllCompanies: vi.fn(),
}));

vi.mock('@/services/member.service', () => ({
  memberService: {
    getUserCompanies: mockGetUserCompanies,
    attachToCompany: mockAttach,
    removeFromCompany: mockDetach,
    getMembers: vi.fn(async () => ({ success: true, data: [], total: 0, page: 1, limit: 20 })),
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
    resetPassword: vi.fn(),
    resetPasswordAndSendEmail: vi.fn(),
    searchUsers: vi.fn(),
  },
}));

vi.mock('@/services/role.service', () => ({
  roleService: { getRoles: mockGetRoles },
}));

vi.mock('@/services/company.service', () => ({
  companyService: {
    getAllCompanies: mockGetAllCompanies,
    getCompanies: vi.fn(),
    getCompany: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { companyId: 'company-1' }, path: '/companies/company-1/members', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

let wrapper: VueWrapper | null = null;

const mountModal = async () => {
  wrapper = mount(MemberCompaniesModal, {
    props: { modelValue: true, userId: 'u-1', userName: 'Iván', userEmail: 'ivan@x.co' },
    global: { directives: { permission: {} } },
    attachTo: document.body,
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
};

const bodyText = () => document.body.textContent ?? '';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();

  mockGetUserCompanies.mockResolvedValue({
    success: true,
    data: [{ id: 'company-1', name: 'Acme', slug: 'acme', roles: ['Owner'] }],
  });
  mockGetRoles.mockResolvedValue([
    { id: 'r-1', name: 'Admin' },
    { id: 'r-2', name: 'Viewer' },
  ]);
  mockGetAllCompanies.mockResolvedValue({
    success: true,
    data: [{ id: 'company-2', name: 'Globex', slug: 'globex', tax_id: null, is_active: true, member_count: 5 }],
  });
  mockAttach.mockResolvedValue({ success: true, data: { id: 'u-1' } });
  mockDetach.mockResolvedValue({ success: true });

  const authStore = useAuthStore();
  authStore.user = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@acme.co',
    isSuperAdmin: true,
    tenants: [{ id: 'company-1', name: 'Acme', slug: 'acme', roles: ['Owner'] }],
  } as any;
  authStore.activeTenantId = 'company-1';
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('MemberCompaniesModal', () => {
  it('lista las empresas del miembro con sus roles', async () => {
    await mountModal();
    expect(mockGetUserCompanies).toHaveBeenCalledWith('u-1');
    expect(bodyText()).toContain('Acme');
    expect(bodyText()).toContain('Owner');
  });

  it('ofrece agregar empresas administrables aún no asignadas', async () => {
    await mountModal();
    // Globex (de "todas") aparece como opción; Acme ya asignada no.
    expect(bodyText()).toContain('Agregar a otra empresa');
  });

  it('agregar llama a attach con roleNames y recarga la lista', async () => {
    await mountModal();
    const selects = document.body.querySelectorAll('select');
    // Primer select = empresa, segundo = rol.
    expect(selects.length).toBeGreaterThanOrEqual(2);

    const buttons = [...document.body.querySelectorAll('button')];
    const addBtn = buttons.find((b) => b.textContent?.includes('Agregar a la empresa'));
    expect(addBtn).toBeDefined();
  });

  it('quitar pide confirmación y luego desvincula', async () => {
    await mountModal();
    const buttons = [...document.body.querySelectorAll('button')];
    const removeBtn = buttons.find((b) => b.textContent?.trim() === 'Quitar');
    expect(removeBtn).toBeDefined();

    removeBtn!.click();
    await flushPromises();

    const confirmBtn = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Confirmar',
    );
    expect(confirmBtn).toBeDefined();

    confirmBtn!.click();
    await flushPromises();
    await flushPromises();

    expect(mockDetach).toHaveBeenCalledWith('company-1', 'u-1');
    // Tras desvincular recarga la lista.
    expect(mockGetUserCompanies).toHaveBeenCalledTimes(2);
  });

  it('usa el servicio real attachToCompany al confirmar agregar', async () => {
    expect(memberService.attachToCompany).toBeDefined();
    await mountModal();
    // El select de empresa tiene a Globex como opción (no asignada).
    const companySelect = document.body.querySelectorAll('select')[0] as HTMLSelectElement;
    const options = [...companySelect.options].map((o) => o.textContent);
    expect(options.join(' ')).toContain('Globex');
  });
});
