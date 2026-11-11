import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsService } from './documents.service.js';

const DOCUMENT = {
  id: 'doc-1',
  company_id: 'company-1',
  module_code: 'shared.documents',
  title: 'Contrato',
  description: null,
  category: null,
  status: 'active',
  current_version: 1,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const VERSION = {
  id: 'version-1',
  company_id: 'company-1',
  document_id: 'doc-1',
  version: 1,
  storage_key: 'company-1/doc-1/key',
  filename: 'contrato.pdf',
  content_type: 'application/pdf',
  size_bytes: 4,
  checksum_sha256: 'a'.repeat(64),
  uploaded_by: 'user-1',
  created_at: new Date().toISOString(),
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    create: vi.fn(async () => ({ document: DOCUMENT, versions: [VERSION], links: [] })),
    list: vi.fn(async () => ({ items: [], total: 0 })),
    getDetail: vi.fn(async () => ({ document: DOCUMENT, versions: [VERSION], links: [] })),
    getVersion: vi.fn(async () => VERSION),
    addVersion: vi.fn(async () => ({ document: { ...DOCUMENT, current_version: 2 }, version: { ...VERSION, version: 2 } })),
    update: vi.fn(async () => DOCUMENT),
    delete: vi.fn(async () => ['company-1/doc-1/key']),
    addLink: vi.fn(async () => ({ id: 'link-1' })),
    removeLink: vi.fn(async () => true),
    ...overrides,
  } as any;
  const storage = {
    put: vi.fn(async () => {}),
    get: vi.fn(async () => Buffer.from('data')),
    delete: vi.fn(async () => {}),
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return {
    service: new DocumentsService(repository, storage, entitlements),
    repository,
    storage,
    entitlements,
  };
}

const FILE = {
  buffer: Buffer.from('data'),
  filename: 'Contrato.PDF',
  contentType: 'application/pdf',
};

describe('DocumentsService', () => {
  it('sube el binario, calcula el checksum y crea la versión inicial', async () => {
    const { service, repository, storage, entitlements } = createService();

    await service.create('company-1', 'user-1', { title: 'Contrato' }, FILE);

    expect(entitlements.assertWritableModule).toHaveBeenCalledWith(
      'company-1',
      'shared.documents',
    );
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringContaining('company-1/'),
      FILE.buffer,
      'application/pdf',
    );
    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.any(String),
      expect.objectContaining({ title: 'Contrato' }),
      expect.objectContaining({
        filename: 'Contrato.PDF',
        sizeBytes: 4,
        checksum: createHash('sha256').update(FILE.buffer).digest('hex'),
      }),
    );
  });

  it('usa el nombre del archivo si no hay título y normaliza el vínculo', async () => {
    const { service, repository } = createService();

    await service.create(
      'company-1',
      'user-1',
      {
        title: '   ',
        link: { entityType: ' ANALYSIS ', entityId: '11111111-1111-4111-8111-111111111111' },
      },
      FILE,
    );

    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.any(String),
      expect.objectContaining({
        title: 'Contrato',
        link: { entityType: 'analysis', entityId: '11111111-1111-4111-8111-111111111111' },
      }),
      expect.any(Object),
    );
  });

  it('limpia el objeto si falla la escritura en base', async () => {
    const { service, storage } = createService({
      create: vi.fn(async () => {
        throw new Error('db boom');
      }),
    });

    await expect(
      service.create('company-1', 'user-1', { title: 'Contrato' }, FILE),
    ).rejects.toThrow('db boom');

    expect(storage.delete).toHaveBeenCalled();
  });

  it('no permite versiones nuevas de un documento archivado', async () => {
    const { service, storage } = createService({
      getDetail: vi.fn(async () => ({
        document: { ...DOCUMENT, status: 'archived' },
        versions: [],
        links: [],
      })),
    });

    await expect(
      service.addVersion('company-1', 'user-1', 'doc-1', FILE),
    ).rejects.toThrow('archivado');
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('descarga la versión indicada desde el storage', async () => {
    const { service, repository } = createService();

    const file = await service.download('company-1', 'doc-1', 2);

    expect(repository.getVersion).toHaveBeenCalledWith('company-1', 'doc-1', 2);
    expect(file).toMatchObject({ filename: 'contrato.pdf', contentType: 'application/pdf' });
    expect(file.buffer).toEqual(Buffer.from('data'));
  });

  it('elimina documentos y sus binarios', async () => {
    const { service, storage } = createService();

    await service.delete('company-1', 'doc-1');

    expect(storage.delete).toHaveBeenCalledWith('company-1/doc-1/key');
  });
});
