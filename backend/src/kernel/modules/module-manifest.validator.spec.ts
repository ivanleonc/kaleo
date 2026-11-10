import { describe, expect, it } from 'vitest';
import { validateManifests } from './module-manifest.validator.js';
import type { ModuleManifest } from './module-manifest.types.js';

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

describe('validateManifests', () => {
  it('acepta manifests válidos con dependencias', () => {
    expect(() =>
      validateManifests([
        manifest({ code: 'core.base' }),
        manifest({ code: 'core.users', dependsOn: ['core.base'] }),
      ]),
    ).not.toThrow();
  });

  it('rechaza códigos duplicados', () => {
    expect(() =>
      validateManifests([manifest({ code: 'core.users' }), manifest({ code: 'core.users' })]),
    ).toThrow('duplicado');
  });

  it('rechaza dependencias inexistentes', () => {
    expect(() =>
      validateManifests([manifest({ code: 'core.users', dependsOn: ['core.missing'] })]),
    ).toThrow('no existe');
  });

  it('rechaza ciclos', () => {
    expect(() =>
      validateManifests([
        manifest({ code: 'core.a', dependsOn: ['core.b'] }),
        manifest({ code: 'core.b', dependsOn: ['core.a'] }),
      ]),
    ).toThrow('Ciclo');
  });

  it('impide que un core dependa de un pack', () => {
    expect(() =>
      validateManifests([
        manifest({ code: 'construction.projects', isCore: false }),
        manifest({ code: 'core.users', dependsOn: ['construction.projects'] }),
      ]),
    ).toThrow('no puede depender de un pack');
  });
});
