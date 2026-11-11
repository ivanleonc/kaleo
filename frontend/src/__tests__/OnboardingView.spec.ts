import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import OnboardingView from '@/views/OnboardingView.vue';
import { useAuthStore } from '@/stores/auth.store';

const { mockGetState, mockUpdateState, mockAvailable, mockRoles } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  mockUpdateState: vi.fn(),
  mockAvailable: vi.fn(),
  mockRoles: vi.fn(),
}));

vi.mock('@/composables/useCompanyPath', () => ({
  useCompanyPath: () => ({
    companyId: ref('company-1'),
    companyDashboardPath: () => '/companies/acme/dashboard',
  }),
}));

vi.mock('@/services/onboarding.service', () => ({
  onboardingService: {
    getState: mockGetState,
    updateState: mockUpdateState,
  },
}));

vi.mock('@/services/module.service', () => ({
  moduleService: {
    getAvailable: mockAvailable,
    setSelection: vi.fn(),
  },
}));

vi.mock('@/services/role.service', () => ({
  roleService: {
    getRoles: mockRoles,
  },
}));

vi.mock('@/services/invitation.service', () => ({
  invitationService: {
    create: vi.fn(),
  },
}));

const MODULES = [
  {
    code: 'core.operations',
    name: 'Operaciones',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [],
    routes: [{ path: '/operations', name: 'Operations', title: 'Operaciones', nav: true }],
    status: 'enabled',
  },
  {
    code: 'shared.documents',
    name: 'Documentos',
    version: '1.0.0',
    vertical: null,
    isCore: false,
    dependsOn: [],
    permissions: [],
    routes: [{ path: '/documents', name: 'Documents', title: 'Documentos', nav: true }],
    onboarding: [
      { code: 'upload-first-document', title: 'Sube tu primer documento' },
    ],
    status: 'enabled',
  },
];

describe('OnboardingView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = {
      id: 'user-1',
      name: 'Iván',
      email: 'ivan@acme.co',
      tenants: [{ id: 'company-1', name: 'Acme', slug: 'acme' }],
    } as any;

    mockGetState.mockResolvedValue({
      success: true,
      data: {
        startedAt: '2026-11-10T00:00:00.000Z',
        completedAt: null,
        completed: false,
        completedSteps: ['company'],
        selectedModules: [],
      },
    });
    mockUpdateState.mockResolvedValue({ success: true, data: {} });
    mockAvailable.mockResolvedValue({ success: true, data: MODULES });
    mockRoles.mockResolvedValue([
      { id: 'role-admin', name: 'Admin', company_id: null, permissions: [] },
      { id: 'role-viewer', name: 'Viewer', company_id: null, permissions: [] },
    ]);
  });

  it('retoma el onboarding en el paso de módulos', async () => {
    const wrapper = mount(OnboardingView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthLayout: { template: '<div><slot /></div>' } },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Elige tus módulos');
    expect(wrapper.text()).toContain('Documentos');
    expect(wrapper.text()).toContain('Operaciones');
    expect(wrapper.text()).toContain('Desactivar');
    expect(mockGetState).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('avanza al paso de equipo y guarda el progreso', async () => {
    const wrapper = mount(OnboardingView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthLayout: { template: '<div><slot /></div>' } },
      },
    });

    await flushPromises();

    const button = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Continuar con el equipo');
    expect(button).toBeDefined();

    await button!.trigger('click');
    await flushPromises();

    expect(mockUpdateState).toHaveBeenCalledWith({ completedSteps: ['modules'] });
    expect(wrapper.text()).toContain('Invita a tu equipo');
    expect(wrapper.text()).toContain('Correo electrónico');

    wrapper.unmount();
  });
});
