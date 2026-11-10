import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import OperationsView from '@/views/OperationsView.vue';

const { mockList, mockRequestExport, mockRequestReport, mockImport, mockDownload } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockRequestExport: vi.fn(),
  mockRequestReport: vi.fn(),
  mockImport: vi.fn(),
  mockDownload: vi.fn(),
}));

vi.mock('@/services/operations.service', () => ({
  operationsService: {
    list: mockList,
    requestExport: mockRequestExport,
    requestAnalysesReport: mockRequestReport,
    importBranchesFile: mockImport,
    download: mockDownload,
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const READY = {
  id: 'op-1',
  kind: 'export',
  resource: 'members',
  format: 'csv',
  status: 'ready',
  filename: 'miembros.csv',
  content_type: 'text/csv',
  result: null,
  error: null,
  created_at: '2026-11-10T00:00:00.000Z',
  completed_at: '2026-11-10T00:00:05.000Z',
};

describe('OperationsView', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({ success: true, data: [READY] });
    mockRequestExport.mockResolvedValue({ success: true, data: READY });
    mockRequestReport.mockResolvedValue({ success: true, data: READY });
    mockImport.mockResolvedValue({ success: true, data: READY });
    mockDownload.mockResolvedValue({ blob: new Blob(['x']), filename: 'miembros.csv' });
  });

  it('muestra el historial y permite solicitar una exportación', async () => {
    const wrapper = mount(OperationsView, {
      global: {
        stubs: {
          AuthenticatedLayout: { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Miembros');
    expect(wrapper.text()).toContain('Descargar miembros.csv');

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Generar exportación');
    expect(exportButton).toBeDefined();

    await exportButton!.trigger('click');
    await flushPromises();

    expect(mockRequestExport).toHaveBeenCalledWith('members', 'csv');

    wrapper.unmount();
  });
});
