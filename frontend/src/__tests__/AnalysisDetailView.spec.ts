import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AnalysisDetailView from '@/views/AnalysisDetailView.vue';
import { useAuthStore } from '@/stores/auth.store';
import { buildMockEnergyDashboard } from '@/services/energy.mock';
import type { AnalysisDetail } from '@/types/analysis';

const { mockGetAnalysis, mockPush, detailState } = vi.hoisted(() => ({
  mockGetAnalysis: vi.fn(),
  mockPush: vi.fn(),
  detailState: { id: 'analysis-1' },
}));

vi.mock('@/services/analysis.service', () => ({
  analysisService: {
    getAnalyses: vi.fn(),
    getAnalysis: mockGetAnalysis,
    createAnalysis: vi.fn(),
    renameAnalysis: vi.fn(),
    deleteAnalysis: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { companyId: 'company-1', analysisId: detailState.id },
    path: `/companies/company-1/analyses/${detailState.id}`,
    query: {},
  }),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const DASHBOARD = buildMockEnergyDashboard(
  new File(['contenido'], 'enero.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: 1768471200000,
  }),
);

const DETAIL: AnalysisDetail = {
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
    periodFrom: DASHBOARD.meta.periodFrom,
    periodTo: DASHBOARD.meta.periodTo,
    rowsProcessed: DASHBOARD.meta.rowsProcessed,
    kpis: DASHBOARD.kpis,
  },
  result: DASHBOARD,
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-01T10:00:00.000Z',
};

let wrapper: VueWrapper | null = null;

async function mountView() {
  wrapper = mount(AnalysisDetailView, {
    global: {
      stubs: {
        AuthenticatedLayout: { template: '<div><slot /></div>' },
        EnergyDashboard: { template: '<div class="dashboard-stub" />' },
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
  mockGetAnalysis.mockReset();
  mockPush.mockReset();
  detailState.id = 'analysis-1';
  mockGetAnalysis.mockResolvedValue({ success: true, data: DETAIL });

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

describe('AnalysisDetailView', () => {
  it('muestra los metadatos y el dashboard del análisis energético', async () => {
    await mountView();

    expect(mockGetAnalysis).toHaveBeenCalledWith('analysis-1');
    expect(wrapper!.text()).toContain('Facturación enero');
    expect(wrapper!.text()).toContain('enero.xlsx');
    expect(wrapper!.text()).toContain('2,0 KB');
    expect(wrapper!.text()).toContain('Energía');
    expect(wrapper!.text()).toContain('Datos de la API');
    expect(wrapper!.text()).toContain('Ana');
    expect(wrapper!.find('.dashboard-stub').exists()).toBe(true);
  });

  it('muestra un fallback para tipos de análisis sin visualización', async () => {
    mockGetAnalysis.mockResolvedValue({
      success: true,
      data: {
        ...DETAIL,
        analysis_type: 'inventory',
        summary: {},
        result: { foo: 'bar' },
      },
    });
    await mountView();

    expect(wrapper!.text()).toContain('Visualización no disponible');
    expect(wrapper!.text()).toContain('inventory');
    expect(wrapper!.find('.dashboard-stub').exists()).toBe(false);
  });

  it('avisa cuando un análisis energético no tiene un resultado válido', async () => {
    mockGetAnalysis.mockResolvedValue({
      success: true,
      data: { ...DETAIL, result: { foo: 'bar' } },
    });
    await mountView();

    expect(wrapper!.text()).toContain('no tiene el formato esperado');
    expect(wrapper!.find('.dashboard-stub').exists()).toBe(false);
  });

  it('recarga al reintentar tras un error de carga', async () => {
    mockGetAnalysis.mockRejectedValueOnce(new Error('Sin conexión'));
    await mountView();

    expect(wrapper!.text()).toContain('No pudimos cargar el análisis');
    expect(wrapper!.text()).toContain('Sin conexión');

    const retry = wrapper!.findAll('button').find((button) =>
      button.text().includes('Reintentar'),
    );
    expect(retry).toBeDefined();

    await retry!.trigger('click');
    await flushPromises();

    expect(mockGetAnalysis).toHaveBeenCalledTimes(2);
    expect(wrapper!.find('.dashboard-stub').exists()).toBe(true);
  });
});
