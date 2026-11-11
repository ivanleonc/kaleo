import { describe, expect, it, vi } from 'vitest';
import { sha256 } from '../common/utils/crypto.js';
import { ProjectSharesRepository } from './project-shares.repository.js';
import { ProjectSharesService } from './project-shares.service.js';

const LINK = {
  id: 'link-1',
  company_id: 'company-1',
  project_id: 'project-1',
  label: 'Cliente',
  scope: 'budget' as const,
  expires_at: null,
  revoked_at: null,
  views_count: 0,
  created_by: 'user-1',
  creator_name: 'Ana',
  created_at: '',
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    list: vi.fn(async () => [LINK]),
    create: vi.fn(async () => LINK),
    revoke: vi.fn(async () => true),
    resolveSharedProject: vi.fn(async () => ({
      company_name: 'Acme',
      project: {
        code: 'PRY-001',
        name: 'Torre',
        description: null,
        status: 'active',
        category: 'edificacion',
        client_name: null,
        start_date: null,
        end_date: null,
      },
      budget: null,
    })),
    ...overrides,
  } as any;
  const projects = { get: vi.fn(async () => ({ id: 'project-1' })) } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return {
    service: new ProjectSharesService(repository, projects, entitlements),
    repository,
    projects,
    entitlements,
  };
}

describe('ProjectSharesService', () => {
  it('crea el enlace guardando solo el hash del token', async () => {
    const { service, repository } = createService();

    const created = await service.create('company-1', 'user-1', 'project-1', {
      label: 'Cliente',
      scope: 'budget',
      expiresInDays: 15,
    });

    const expectedHash = sha256(created.token);
    expect(created.token).toBeTruthy();
    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'project-1',
      expect.objectContaining({ label: 'Cliente', scope: 'budget' }),
      expectedHash,
    );
  });

  it('rechaza expiraciones fuera de rango', async () => {
    const { service } = createService();

    await expect(
      service.create('company-1', 'user-1', 'project-1', { expiresInDays: 400 }),
    ).rejects.toThrow('entre 1 y 365');
  });

  it('resuelve el portal por token y rechaza enlaces inexistentes', async () => {
    const { service, repository } = createService();

    await expect(service.resolvePublic(' token ')).resolves.toMatchObject({
      company_name: 'Acme',
    });
    expect(repository.resolveSharedProject).toHaveBeenCalledWith(sha256('token'));

    const missing = createService({ resolveSharedProject: vi.fn(async () => null) });
    await expect(missing.service.resolvePublic('token')).rejects.toThrow(
      'inválido, expirado o revocado',
    );
  });

  it('revoca solo enlaces existentes', async () => {
    const { service, repository } = createService();

    await service.revoke('company-1', 'project-1', 'link-1');
    expect(repository.revoke).toHaveBeenCalledWith('company-1', 'project-1', 'link-1');

    const missing = createService({ revoke: vi.fn(async () => false) });
    await expect(missing.service.revoke('company-1', 'project-1', 'link-1')).rejects.toThrow(
      'no encontrado',
    );
  });
});

describe('ProjectSharesRepository', () => {
  it('no devuelve un enlace expirado', async () => {
    const privileged = {
      query: vi.fn(async () => [
        {
          id: 'link-1',
          company_id: 'company-1',
          project_id: 'project-1',
          scope: 'summary',
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          revoked_at: null,
        },
      ]),
    };
    const repository = new ProjectSharesRepository(
      {} as any,
      { requireCompanyId: () => 'company-1' } as any,
      privileged as any,
    );

    await expect(repository.resolveSharedProject('hash')).resolves.toBeNull();
    expect(privileged.query).toHaveBeenCalledTimes(1);
  });
});
