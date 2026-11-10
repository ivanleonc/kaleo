import type { ModuleManifest } from './module-manifest.types.js';

const MODULE_CODE_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

/**
 * Valida el registry en memoria antes de sincronizarlo con la base.
 * Falla rápido al arrancar si un manifest está mal.
 */
export function validateManifests(manifests: ModuleManifest[]): void {
  const byCode = new Map<string, ModuleManifest>();

  for (const manifest of manifests) {
    if (!MODULE_CODE_RE.test(manifest.code)) {
      throw new Error(`Código de módulo inválido: "${manifest.code}"`);
    }
    if (byCode.has(manifest.code)) {
      throw new Error(`Módulo duplicado en manifests: "${manifest.code}"`);
    }
    byCode.set(manifest.code, manifest);
  }

  for (const manifest of manifests) {
    for (const dependency of manifest.dependsOn) {
      if (!byCode.has(dependency)) {
        throw new Error(
          `El módulo "${manifest.code}" depende de "${dependency}", que no existe`,
        );
      }
      if (manifest.isCore && byCode.get(dependency)?.isCore === false) {
        throw new Error(
          `Un módulo core no puede depender de un pack: "${manifest.code}" -> "${dependency}"`,
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (code: string, path: string[]) => {
    if (visiting.has(code)) {
      throw new Error(`Ciclo de dependencias: ${[...path, code].join(' -> ')}`);
    }
    if (visited.has(code)) return;

    visiting.add(code);
    for (const dependency of byCode.get(code)?.dependsOn ?? []) {
      visit(dependency, [...path, code]);
    }
    visiting.delete(code);
    visited.add(code);
  };

  for (const manifest of manifests) visit(manifest.code, []);
}
