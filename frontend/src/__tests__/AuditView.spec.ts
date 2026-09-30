import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AuditView from '@/views/AuditView.vue';
import { useAuthStore } from '@/stores/auth.store';

const { mockGetLogs, mockGetEntityTypes, mockPush } = vi.hoisted(() => ({
  mockGetLogs: vi.fn(),
  mockGetEntityTypes: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/services/audit.service', () => ({
  auditService: {
    getLogs: mockGetLogs,
    getEntityTypes: mockGetEntityTypes,
    fetchCsvBlob: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { companyId: 'company-1' },
    path: '/companies/company-1/audit',
  }),
  useRouter: () => ({ push: mockPush }),
}));

const LOG = {
  id: 'log-1',
  entity_type: 'Member',
  action: 'member.created',
  created_at: '2026-01-01T00:00:00.000Z',
  user_name: 'Admin',
};

let wrapper: VueWrapper | null = null;

const mountView = async () => {
  wrapper = mount(AuditView, {
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

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createPinia());
  mockGetLogs.mockReset();
  mockGetEntityTypes.mockReset();
  mockPush.mockClear();

  mockGetLogs.mockResolvedValue({ success: true, data: [{ ...LOG }], hasNext: false, nextCursor: null });
  mockGetEntityTypes.mockResolvedValue({ success: true, data: ['Member', 'Branch'] });

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

describe('AuditView — filtros (regresión)', () => {
  it('cambiar la entidad dispara el fetch con entityType', async () => {
    await mountView();
    expect(mockGetLogs).toHaveBeenCalled();
    mockGetLogs.mockClear();

    // El bug: el select de entidad no tenía watcher ni @change y no hacía nada.
    const select = wrapper!.find('.filters-bar select');
    await select.setValue('Member');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(mockGetLogs).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Member' }),
    );
  });

  it('el par de fechas filtra desde/hasta con el mismo fetch', async () => {
    await mountView();
    mockGetLogs.mockClear();

    const dates = wrapper!.find('.filters-bar').findAll('input[type="date"]');
    await dates[0]?.setValue('2026-01-01');
    await dates[1]?.setValue('2026-01-31');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(mockGetLogs).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01', to: '2026-01-31' }),
    );
  });

  it('Limpiar resetea y vuelve a pedir sin filtros', async () => {
    await mountView();

    const select = wrapper!.find('.filters-bar select');
    await select.setValue('Member');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    mockGetLogs.mockClear();

    await wrapper!.find('.clear-btn').trigger('click');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    const calls = mockGetLogs.mock.calls;
    const last = calls[calls.length - 1]?.[0] as Record<string, unknown>;
    expect(last.entityType).toBeUndefined();
    expect(last.action).toBeUndefined();
  });
});
