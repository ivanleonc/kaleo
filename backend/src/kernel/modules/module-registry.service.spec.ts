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
    getModuleConfig: vi.fn(async () => ({})),
    setModuleConfig: vi.fn(async (_companyId: string, _code: string, config: any) => config),
  } as any;
  const entitlements = {
    getPlanModuleCodes: vi.fn(async () => planModules),
    isReadOnly: vi.fn(async () => false),
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
      ['construction.projects'],
    );
    const modules = await service.getEnabledModules('company-1');

    expect(modules.some((m) => m.code === 'construction.projects' && m.status === 'trial'))
      .toBe(true);
  });

  it('incluye desactivados en el catálogo disponible, pero no en los habilitados', async () => {
    const service = createService(
      new Map<string, ModuleStatus>([['crm.accounts', 'disabled']]),
      [
        manifest({ code: 'core.users' }),
        manifest({ code: 'crm.accounts', isCore: false }),
      ],
      ['crm.accounts'],
    );

    const available = await service.getAvailableModules('company-1');
    expect(available.find((m) => m.code === 'crm.accounts')?.status).toBe('disabled');

    const enabled = await service.getEnabledModules('company-1');
    expect(enabled.map((m) => m.code)).toEqual(['core.users']);
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

  it('mantiene en solo lectura un pack que salió del plan', async () => {
    const service = createService(
      new Map<string, ModuleStatus>([['construction.projects', 'enabled']]),
      [
        manifest({ code: 'core.users' }),
        manifest({ code: 'construction.projects', isCore: false, vertical: 'construction' }),
      ],
      [],
    );
    const modules = await service.getEnabledModules('company-1');

    expect(modules.find((m) => m.code === 'construction.projects')?.status).toBe('read_only');
  });

  it('marca todo el plan como solo lectura si la suscripción venció', async () => {
    const service = createService(
      new Map(),
      [
        manifest({ code: 'core.users' }),
        manifest({ code: 'construction.projects', isCore: false, vertical: 'construction' }),
      ],
      ['construction.projects'],
    );
    // Simula suscripción vencida.
    (service as any).entitlements.isReadOnly = vi.fn(async () => true);
    const modules = await service.getEnabledModules('company-1');

    expect(modules.find((m) => m.code === 'construction.projects')?.status).toBe('read_only');
    expect(modules.find((m) => m.code === 'core.users')?.status).toBe('enabled');
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

describe('ModuleRegistryService module config', () => {
  const core = manifest({ code: 'core.users' });
  const pack = manifest({ code: 'construction.projects', isCore: false });

  function setup(statuses = new Map<string, ModuleStatus>()) {
    const repository = {
      syncCatalog: vi.fn(async () => {}),
      getCompanyModuleStatuses: vi.fn(async () => statuses),
      setCompanyModule: vi.fn(async (_c: string, _code: string, enabled: boolean) =>
        enabled ? 'enabled' : 'disabled',
      ),
      getModuleConfig: vi.fn(async () => ({ threshold: 10 })),
      setModuleConfig: vi.fn(async (_c: string, _code: string, config: any) => config),
    } as any;
    const entitlements = {
      getPlanModuleCodes: vi.fn(async () => [] as string[]),
      isReadOnly: vi.fn(async () => false),
      assertWritableModule: vi.fn(async () => {}),
    } as any;
    return {
      service: new ModuleRegistryService(repository, [core, pack], entitlements),
      repository,
    };
  }

  it('permite configurar un módulo core', async () => {
    const { service } = setup();
    await expect(service.getModuleConfig('c-1', 'core.users'))
      .resolves.toEqual({ threshold: 10 });
  });

  it('rechaza configurar un pack no habilitado', async () => {
    const { service } = setup();
    await expect(service.getModuleConfig('c-1', 'construction.projects'))
      .rejects.toThrow('no está habilitado');
  });

  it('guarda la configuración de un pack habilitado', async () => {
    const { service, repository } = setup(
      new Map<string, ModuleStatus>([['construction.projects', 'enabled']]),
    );
    await expect(
      service.setModuleConfig('c-1', 'construction.projects', { threshold: 5 }),
    ).resolves.toEqual({ threshold: 5 });
    expect(repository.setModuleConfig).toHaveBeenCalledWith(
      'c-1',
      'construction.projects',
      { threshold: 5 },
    );
  });
});
