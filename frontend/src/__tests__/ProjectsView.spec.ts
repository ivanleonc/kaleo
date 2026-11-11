import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProjectsView from '@/views/ProjectsView.vue';

const { mockList, mockGet } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('@/services/project.service', () => ({
  projectService: {
    list: mockList,
    get: mockGet,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock('@/services/branch.service', () => ({
  branchService: { getBranches: vi.fn(async () => ({ data: [], total: 0, page: 1, limit: 100 })) },
}));

vi.mock('@/services/party.service', () => ({
  partyService: { list: vi.fn(async () => ({ data: [], total: 0, page: 1, limit: 100 })) },
}));

vi.mock('@/services/catalog.service', () => ({
  catalogService: { getCurrencies: vi.fn(async () => []) },
}));

vi.mock('@/services/member.service', () => ({
  memberService: { getMembers: vi.fn(async () => ({ data: [], total: 0, page: 1, limit: 100 })) },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { companyId: 'company-1' }, path: '' }),
}));

vi.mock('@/composables/useCompanyPath', () => ({
  useCompanyPath: () => ({
    companyPath: (suffix: string) => `/companies/company-1${suffix}`,
  }),
}));

const PROJECT = {
  id: 'project-1',
  company_id: 'company-1',
  branch_id: null,
  branch_name: null,
  client_party_id: 'party-1',
  client_name: 'Constructora Acme',
  code: 'PRY-001',
  name: 'Torre Norte',
  description: null,
  status: 'active',
  currency_code: 'COP',
  start_date: '2026-01-01',
  end_date: null,
  timezone: 'America/Bogota',
  address: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  members_count: 1,
};

const DETAIL = {
  ...PROJECT,
  members: [
    {
      company_id: 'company-1',
      project_id: 'project-1',
      membership_id: 'membership-1',
      project_role: 'manager',
      created_at: new Date().toISOString(),
      user_id: 'user-1',
      user_name: 'Iván León',
      user_email: 'ivan@acme.co',
      membership_status: 'active',
    },
  ],
};

describe('ProjectsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockList.mockResolvedValue({ success: true, data: [PROJECT], total: 1, page: 1, limit: 25 });
    mockGet.mockResolvedValue(DETAIL);
  });

  it('lista proyectos con cliente y estado', async () => {
    const wrapper = mount(ProjectsView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('PRY-001');
    expect(wrapper.text()).toContain('Torre Norte');
    expect(wrapper.text()).toContain('Constructora Acme');
    expect(wrapper.text()).toContain('Activo');

    wrapper.unmount();
  });

  it('abre el equipo del proyecto', async () => {
    const wrapper = mount(ProjectsView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    const button = wrapper.findAll('button').find((item) => item.text() === 'Equipo');
    await button!.trigger('click');
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('project-1');
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Iván León');
    expect(bodyText).toContain('Gerente');

    wrapper.unmount();
  });
});
