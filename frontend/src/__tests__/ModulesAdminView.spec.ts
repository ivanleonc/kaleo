import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ModulesAdminView from '@/views/ModulesAdminView.vue';

const { mockGetCatalog, mockGetModules, mockSetModule, mockGetModuleConfig, mockSetModuleConfig } = vi.hoisted(() => ({
  mockGetCatalog: vi.fn(),
  mockGetModules: vi.fn(),
  mockSetModule: vi.fn(),
  mockGetModuleConfig: vi.fn(),
  mockSetModuleConfig: vi.fn(),
}));

vi.mock('@/services/module.service', () => ({
  moduleService: {
    getCatalog: mockGetCatalog,
    getModules: mockGetModules,
    setModule: mockSetModule,
    getModuleConfig: mockGetModuleConfig,
    setModuleConfig: mockSetModuleConfig,
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const CORE = {
  code: 'core.users',
  name: 'Usuarios',
  version: '1.0.0',
  vertical: null,
  isCore: true,
  dependsOn: [],
  permissions: [],
  routes: [],
};

const PACK = {
  code: 'construction.projects',
  name: 'Proyectos',
  version: '1.0.0',
  vertical: 'construction',
  isCore: false,
  dependsOn: [],
  permissions: [],
  routes: [],
};

describe('ModulesAdminView', () => {
  beforeEach(() => {
    mockGetCatalog.mockResolvedValue({ success: true, data: [CORE, PACK] });
    mockGetModules.mockResolvedValue({ success: true, data: [CORE] });
    mockSetModule.mockResolvedValue({ success: true });
    mockGetModuleConfig.mockResolvedValue({ success: true, data: {} });
    mockSetModuleConfig.mockResolvedValue({ success: true });
  });

  it('marca los core como siempre activos y permite activar un pack', async () => {
    const wrapper = mount(ModulesAdminView, {
      global: {
        stubs: {
          AuthenticatedLayout: { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Usuarios');
    expect(wrapper.text()).toContain('core.users');
    expect(wrapper.text()).toContain('Los módulos core siempre están activos');

    const activate = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Activar');
    expect(activate).toBeDefined();

    await activate!.trigger('click');
    await flushPromises();

    expect(mockSetModule).toHaveBeenCalledWith('construction.projects', true);
  });

  it('muestra el error del backend al fallar la activación', async () => {
    mockSetModule.mockRejectedValueOnce({
      response: {
        data: { message: 'El módulo requiere "construction.projects" habilitado primero' },
      },
    });

    const wrapper = mount(ModulesAdminView, {
      global: {
        stubs: {
          AuthenticatedLayout: { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const activate = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Activar');
    await activate!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('El módulo requiere');
  });

  it('abre y guarda la configuración JSON de un módulo', async () => {
    mockGetModuleConfig.mockResolvedValueOnce({ success: true, data: { threshold: 10 } });

    const wrapper = mount(ModulesAdminView, {
      global: {
        stubs: {
          AuthenticatedLayout: { template: '<div><slot /></div>' },
        },
      },
      attachTo: document.body,
    });

    await flushPromises();

    const configure = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Configurar');
    await configure!.trigger('click');
    await flushPromises();

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.value).toContain('"threshold": 10');

    textarea!.value = '{"threshold": 5}';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));

    document
      .querySelector<HTMLFormElement>('.ui-form-modal')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(mockSetModuleConfig).toHaveBeenCalledWith('core.users', { threshold: 5 });

    wrapper.unmount();
  });
});
