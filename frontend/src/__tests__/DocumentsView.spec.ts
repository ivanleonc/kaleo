import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DocumentsView from '@/views/DocumentsView.vue';

const { mockList, mockGet, mockDownload } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockDownload: vi.fn(),
}));

vi.mock('@/services/document.service', () => ({
  documentService: {
    list: mockList,
    get: mockGet,
    upload: vi.fn(),
    addVersion: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    download: mockDownload,
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const DOCUMENT = {
  id: 'doc-1',
  company_id: 'company-1',
  module_code: 'shared.documents',
  title: 'Contrato 2026',
  description: 'Contrato firmado',
  category: 'Contrato',
  status: 'active',
  current_version: 2,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  filename: 'contrato.pdf',
  content_type: 'application/pdf',
  size_bytes: 2048,
  checksum_sha256: 'a'.repeat(64),
  links_count: 1,
};

const DETAIL = {
  document: DOCUMENT,
  versions: [
    {
      id: 'version-2',
      company_id: 'company-1',
      document_id: 'doc-1',
      version: 2,
      storage_key: 'company-1/doc-1/key',
      filename: 'contrato.pdf',
      content_type: 'application/pdf',
      size_bytes: 2048,
      checksum_sha256: 'a'.repeat(64),
      uploaded_by: 'user-1',
      created_at: new Date().toISOString(),
    },
    {
      id: 'version-1',
      company_id: 'company-1',
      document_id: 'doc-1',
      version: 1,
      storage_key: 'company-1/doc-1/key-1',
      filename: 'contrato-v1.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
      checksum_sha256: 'b'.repeat(64),
      uploaded_by: 'user-1',
      created_at: new Date().toISOString(),
    },
  ],
  links: [
    {
      id: 'link-1',
      company_id: 'company-1',
      document_id: 'doc-1',
      entity_type: 'analysis',
      entity_id: '11111111-1111-4111-8111-111111111111',
      created_at: new Date().toISOString(),
    },
  ],
};

describe('DocumentsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockList.mockResolvedValue({ success: true, data: [DOCUMENT], total: 1, page: 1, limit: 25 });
    mockGet.mockResolvedValue({ success: true, data: DETAIL });
    mockDownload.mockResolvedValue({ blob: new Blob(['x']), filename: 'contrato.pdf' });
  });

  it('muestra los documentos con su versión actual', async () => {
    const wrapper = mount(DocumentsView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Contrato 2026');
    expect(wrapper.text()).toContain('contrato.pdf');
    expect(wrapper.text()).toContain('v2');
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 25 }),
    );

    wrapper.unmount();
  });

  it('abre el detalle con el historial de versiones', async () => {
    const wrapper = mount(DocumentsView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    const versionsButton = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Versiones');
    expect(versionsButton).toBeDefined();

    await versionsButton!.trigger('click');
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('doc-1');
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Versiones del documento');
    expect(bodyText).toContain('contrato-v1.pdf');
    expect(bodyText).toContain('analysis');

    wrapper.unmount();
  });
});
