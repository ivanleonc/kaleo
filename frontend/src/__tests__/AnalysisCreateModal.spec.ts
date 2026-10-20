import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import AnalysisCreateModal from '@/components/features/analyses/AnalysisCreateModal.vue';
import { useAuthStore } from '@/stores/auth.store';
import { buildMockEnergyDashboard } from '@/services/energy.mock';
import type { Analysis } from '@/types/analysis';

const {
  mockUploadExcel,
  mockCreateAnalysis,
  mockGetAnalyses,
} = vi.hoisted(() => ({
  mockUploadExcel: vi.fn(),
  mockCreateAnalysis: vi.fn(),
  mockGetAnalyses: vi.fn(),
}));

vi.mock('@/services/energy.service', () => ({
  energyService: { uploadExcel: mockUploadExcel },
}));

vi.mock('@/services/analysis.service', () => ({
  analysisService: {
    getAnalyses: mockGetAnalyses,
    getAnalysis: vi.fn(),
    createAnalysis: mockCreateAnalysis,
    renameAnalysis: vi.fn(),
    deleteAnalysis: vi.fn(),
  },
}));

const DASHBOARD = buildMockEnergyDashboard(
  new File(['contenido'], 'enero.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: 1768471200000,
  }),
);

const CREATED: Analysis = {
  id: 'analysis-1',
  company_id: 'company-1',
  created_by: 'user-1',
  created_by_name: 'Ana',
  name: 'Enero',
  analysis_type: 'energy',
  source: 'api',
  file_name: 'enero.xlsx',
  file_size: 9,
  summary: {
    periodFrom: DASHBOARD.meta.periodFrom,
    periodTo: DASHBOARD.meta.periodTo,
    rowsProcessed: DASHBOARD.meta.rowsProcessed,
    kpis: DASHBOARD.kpis,
  },
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-01T10:00:00.000Z',
};

let wrapper: VueWrapper | null = null;

function makeFile(name = 'enero.xlsx'): File {
  return new File(['contenido'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: 1768471200000,
  });
}

async function selectFile(file = makeFile()) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  Object.defineProperty(input!, 'files', { value: [file], configurable: true });
  input!.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
}

async function submitForm() {
  document
    .querySelector<HTMLFormElement>('.ui-form-modal')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flushPromises();
  await flushPromises();
}

async function mountModal() {
  wrapper = mount(AnalysisCreateModal, {
    props: { modelValue: true },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockUploadExcel.mockReset();
  mockCreateAnalysis.mockReset();
  mockGetAnalyses.mockReset();

  mockUploadExcel.mockResolvedValue(DASHBOARD);
  mockCreateAnalysis.mockResolvedValue({ success: true, data: CREATED });
  mockGetAnalyses.mockResolvedValue({
    success: true,
    data: [CREATED],
    total: 1,
    page: 1,
    limit: 20,
  });

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
  document.body.style.overflow = '';
});

describe('AnalysisCreateModal', () => {
  it('procesa el Excel y guarda el resultado con el nombre sugerido', async () => {
    await mountModal();
    await selectFile();
    await submitForm();

    expect(mockUploadExcel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'enero.xlsx' }),
      expect.objectContaining({
        onProgress: expect.any(Function),
        signal: expect.anything(),
      }),
    );
    expect(mockCreateAnalysis).toHaveBeenCalledWith({
      name: 'Enero',
      analysis_type: 'energy',
      file_name: 'enero.xlsx',
      file_size: 9,
      result: DASHBOARD,
    });
    expect(wrapper!.emitted('created')).toEqual([[CREATED]]);
    expect(document.body.textContent).toContain('Análisis guardado');
  });

  it('reintenta solo el guardado cuando falla la persistencia', async () => {
    mockCreateAnalysis
      .mockRejectedValueOnce(new Error('No se pudo guardar en la base de datos'))
      .mockResolvedValueOnce({ success: true, data: CREATED });

    await mountModal();
    await selectFile();
    await submitForm();

    expect(document.body.textContent).toContain(
      'No se pudo guardar en la base de datos',
    );
    expect(mockUploadExcel).toHaveBeenCalledTimes(1);

    const retry = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reintentar guardado'),
    );
    expect(retry).toBeDefined();

    retry!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    await flushPromises();

    expect(mockCreateAnalysis).toHaveBeenCalledTimes(2);
    expect(mockUploadExcel).toHaveBeenCalledTimes(1);
    expect(wrapper!.emitted('created')).toEqual([[CREATED]]);
    expect(document.body.textContent).toContain('Análisis guardado');
  });
});
