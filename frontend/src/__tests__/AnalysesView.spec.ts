import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AnalysesView from '@/views/AnalysesView.vue';
import AnalysisTable from '@/components/features/analyses/AnalysisTable.vue';
import { useAuthStore } from '@/stores/auth.store';
import type { Analysis } from '@/types/analysis';

const { mockGetAnalyses, mockPush, mockReplace, routeState } = vi.hoisted(() => ({
  mockGetAnalyses: vi.fn(),
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  routeState: { query: {} as Record<string, string> },
}));

vi.mock('@/services/analysis.service', () => ({
  analysisService: {
    getAnalyses: mockGetAnalyses,
    getAnalysis: vi.fn(),
    createAnalysis: vi.fn(),
    renameAnalysis: vi.fn(),
    deleteAnalysis: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { companyId: 'company-1' },
    path: '/companies/company-1/analyses',
    query: routeState.query,
  }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const ANALYSIS: Analysis = {
  id: 'analysis-1',
  company_id: 'company-1',
  created_by: 'user-1',
  created_by_name: 'Ana',
  name: 'Facturación enero',
  analysis_type: 'energy',
  source: 'api',
  file_name: 'enero.xlsx',
  file_size: 2048,
  summary: {
    periodFrom: '2026-01-01',
    periodTo: '2026-01-31',
    rowsProcessed: 1200,
    kpis: { nonTechnicalLossesPct: 8.75 },
  },
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-01T10:00:00.000Z',
};

const pageOf = (data: Analysis[], total = data.length) => ({
  success: true,
  data,
  total,
  page: 1,
  limit: 20,
});

let wrapper: VueWrapper | null = null;

async function mountView() {
  wrapper = mount(AnalysesView, {
    global: {
      stubs: {
        AuthenticatedLayout: { template: '<div><slot /></div>' },
        AnalysisCreateModal: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" class="create-modal-stub" />',
        },
        AnalysisRenameModal: true,
      },
      directives: { permission: {} },
    },
    attachTo: document.body,
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockGetAnalyses.mockReset();
  mockPush.mockReset();
  mockReplace.mockReset();
  mockReplace.mockResolvedValue(undefined);
  routeState.query = {};
  mockGetAnalyses.mockResolvedValue(pageOf([ANALYSIS]));

  const authStore = useAuthStore();
  authStore.user = {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@acme.co',
    tenants: [{ id: 'company-1', name: 'Acme', slug: 'acme' }],
  } as never;
  authStore.activeTenantId = 'company-1';
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('AnalysesView', () => {
  it('lista los análisis guardados con su resumen', async () => {
    await mountView();

    expect(mockGetAnalyses).toHaveBeenCalled();
    expect(wrapper!.text()).toContain('Facturación enero');
    expect(wrapper!.text()).toContain('enero.xlsx');
    expect(wrapper!.text()).toContain('1.200');
    expect(wrapper!.text()).toContain('8,8');
  });

  it('navega al detalle al seleccionar un análisis', async () => {
    await mountView();

    wrapper!.findComponent(AnalysisTable).vm.$emit('view', ANALYSIS);
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith('/companies/acme/analyses/analysis-1');
  });

  it('abre el modal de creación desde el query crear=1 y lo limpia', async () => {
    routeState.query = { crear: '1' };
    await mountView();

    expect(wrapper!.find('.create-modal-stub').exists()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith({ query: {} });
  });

  it('muestra el estado vacío con la acción de crear', async () => {
    mockGetAnalyses.mockResolvedValue(pageOf([], 0));
    await mountView();

    expect(wrapper!.text()).toContain('No hay análisis todavía');
    expect(wrapper!.text()).toContain('Nuevo análisis');
  });
});
