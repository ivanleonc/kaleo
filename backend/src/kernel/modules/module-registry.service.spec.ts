import { describe, expect, it, vi } from 'vitest';
import { ModuleRegistryService } from './module-registry.service.js';
import type { ModuleManifest, ModuleStatus } from './module-manifest.types.js';

function manifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    code: 'core.test',
    name: 'Test',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [],
    routes: [],
    ...overrides,
  };
}

function createService(
  statuses: Map<string, ModuleStatus>,
  manifests: ModuleManifest[] = [manifest({ code: 'core.users' })],
) {
  const repository = {
    syncCatalog: vi.fn(async () => {}),
    getCompanyModuleStatuses: vi.fn(async () => statuses),
  } as any;
  return new ModuleRegistryService(repository, manifests);
}

describe('ModuleRegistryService.getEnabledModules', () => {
  it('incluye todos los core sin filas de empresa', async () => {
    const service = createService(new Map());
    const modules = await service.getEnabledModules('company-1');

    expect(modules).toHaveLength(1);
    expect(modules[0]).toMatchObject({ code: 'core.users', status: 'enabled' });
  });

  it('incluye un pack habilitado y respeta su estado', async () => {
    const service = createService(
      new Map<string, ModuleStatus>([['construction.projects', 'trial']]),
      [
        manifest({ code: 'core.users' }),
        manifest({
          code: 'construction.projects',
          name: 'Proyectos',
          vertical: 'construction',
          isCore: false,
        }),
      ],
    );
    const modules = await service.getEnabledModules('company-1');

    expect(modules.some((m) => m.code === 'construction.projects' && m.status === 'trial'))
      .toBe(true);
  });

  it('oculta packs deshabilitados o sin fila', async () => {
    const service = createService(
      new Map<string, ModuleStatus>([['crm.accounts', 'disabled']]),
      [
        manifest({ code: 'core.users' }),
        manifest({ code: 'crm.accounts', isCore: false }),
        manifest({ code: 'construction.projects', isCore: false }),
      ],
    );
    const modules = await service.getEnabledModules('company-1');

    expect(modules.map((m) => m.code)).toEqual(['core.users']);
  });
});
