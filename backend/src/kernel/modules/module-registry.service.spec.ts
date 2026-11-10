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
  planModules: string[] = [],
) {
  const repository = {
    syncCatalog: vi.fn(async () => {}),
    getCompanyModuleStatuses: vi.fn(async () => statuses),
    setCompanyModule: vi.fn(async (_companyId: string, _code: string, enabled: boolean) =>
      enabled ? 'enabled' : 'disabled',
    ),
  } as any;
  const entitlements = {
    getPlanModuleCodes: vi.fn(async () => planModules),
  } as any;
  return new ModuleRegistryService(repository, manifests, entitlements);
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

  it('incluye un pack si el plan lo aporta aunque no tenga fila explícita', async () => {
    const service = createService(
      new Map(),
      [
        manifest({ code: 'core.users' }),
        manifest({
          code: 'construction.projects',
          isCore: false,
          vertical: 'construction',
        }),
      ],
      ['construction.projects'],
    );
    const modules = await service.getEnabledModules('company-1');

    expect(modules.some((m) => m.code === 'construction.projects' && m.status === 'enabled'))
      .toBe(true);
  });
});

describe('ModuleRegistryService.setModuleEnabled', () => {
  const base = manifest({ code: 'core.base' });
  const projects = manifest({
    code: 'construction.projects',
    isCore: false,
    vertical: 'construction',
  });
  const estimating = manifest({
    code: 'construction.estimating',
    isCore: false,
    vertical: 'construction',
    dependsOn: ['construction.projects'],
  });

  function setup(statuses: Map<string, ModuleStatus>) {
    const repository = {
      syncCatalog: vi.fn(async () => {}),
      getCompanyModuleStatuses: vi.fn(async () => statuses),
      setCompanyModule: vi.fn(async (_companyId: string, _code: string, enabled: boolean) =>
        enabled ? 'enabled' : 'disabled',
      ),
    } as any;
    const service = new ModuleRegistryService(repository, [base, projects, estimating]);
    return { service, repository };
  }

  it('rechaza deshabilitar un módulo core', async () => {
    const { service } = setup(new Map());
    await expect(service.setModuleEnabled('c-1', 'core.base', false)).rejects.toThrow('core');
  });

  it('exige dependencias habilitadas antes de activar', async () => {
    const { service } = setup(new Map());
    await expect(service.setModuleEnabled('c-1', 'construction.estimating', true))
      .rejects.toThrow('construction.projects');
  });

  it('activa el módulo cuando la dependencia está habilitada', async () => {
    const { service, repository } = setup(
      new Map<string, ModuleStatus>([['construction.projects', 'enabled']]),
    );
    await expect(service.setModuleEnabled('c-1', 'construction.estimating', true))
      .resolves.toEqual({ code: 'construction.estimating', status: 'enabled' });
    expect(repository.setCompanyModule).toHaveBeenCalledWith(
      'c-1',
      'construction.estimating',
      true,
    );
  });

  it('no deshabilita un módulo con dependientes activos', async () => {
    const { service } = setup(
      new Map<string, ModuleStatus>([
        ['construction.projects', 'enabled'],
        ['construction.estimating', 'enabled'],
      ]),
    );
    await expect(service.setModuleEnabled('c-1', 'construction.projects', false))
      .rejects.toThrow('construction.estimating');
  });
});
