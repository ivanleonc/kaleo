import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NotificationsView from '@/views/NotificationsView.vue';

const { mockList, mockMarkRead, mockMarkAllRead } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockMarkRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    list: mockList,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    unreadCount: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

vi.mock('@/composables/useCompanyPath', () => ({
  useCompanyPath: () => ({
    companyId: { value: 'company-1' },
    companyPath: (suffix: string) => `/companies/company-1${suffix}`,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const NOTIFICATIONS = [
  {
    id: 'n-1',
    type: 'operation.completed',
    category: 'operations',
    title: 'Exportación lista',
    body: 'miembros.csv está disponible',
    link: '/operations',
    data: {},
    read_at: null,
    emailed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'n-2',
    type: 'operation.failed',
    category: 'operations',
    title: 'Importación fallida',
    body: '3 filas con error',
    link: '/operations',
    data: {},
    read_at: new Date().toISOString(),
    emailed_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('NotificationsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockList.mockResolvedValue({ success: true, data: { items: NOTIFICATIONS, unreadCount: 1 } });
    mockMarkRead.mockResolvedValue({ success: true, data: NOTIFICATIONS[0] });
    mockMarkAllRead.mockResolvedValue(1);
  });

  it('lista las notificaciones y muestra el contador de no leídas', async () => {
    const wrapper = mount(NotificationsView, {
      global: {
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Exportación lista');
    expect(wrapper.text()).toContain('miembros.csv está disponible');
    expect(wrapper.text()).toContain('No leídas (1)');
    expect(mockList).toHaveBeenCalledWith({ unreadOnly: false, limit: 100 });

    wrapper.unmount();
  });

  it('marca todas como leídas y actualiza el contador', async () => {
    const wrapper = mount(NotificationsView, {
      global: {
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    const button = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Marcar todas como leídas');
    expect(button).toBeDefined();

    await button!.trigger('click');
    await flushPromises();

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(wrapper.text()).toContain('No leídas (0)');

    wrapper.unmount();
  });
});
