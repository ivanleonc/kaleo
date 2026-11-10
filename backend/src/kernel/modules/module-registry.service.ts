import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { ModuleRegistryRepository } from './module-registry.repository.js';
import { MODULE_MANIFESTS, MODULE_MANIFESTS_TOKEN } from './module-manifests.js';
import { validateManifests } from './module-manifest.validator.js';
import { EntitlementService } from '../billing/entitlement.service.js';
import type { EnabledModule, ModuleManifest, ModuleStatus } from './module-manifest.types.js';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModuleRegistryService.name);

  constructor(
    private readonly repository: ModuleRegistryRepository,
    @Inject(MODULE_MANIFESTS_TOKEN) private readonly manifests: ModuleManifest[] = MODULE_MANIFESTS,
    @Optional() private readonly entitlements?: EntitlementService,
  ) {}

  async onModuleInit(): Promise<void> {
    validateManifests(this.manifests);
    await this.repository.syncCatalog(this.manifests);
    this.logger.log(`Module registry sincronizado (${this.manifests.length} módulos)`);
  }

  /**
   * Módulos visibles para la empresa: los core siempre, los demás solo si
   * tienen una fila habilitada/trial/read_only en `company_modules`.
   */
  async getEnabledModules(companyId: string): Promise<EnabledModule[]> {
    const [statuses, planModules] = await Promise.all([
      this.repository.getCompanyModuleStatuses(companyId),
      this.entitlements?.getPlanModuleCodes(companyId) ?? Promise.resolve([]),
    ]);
    const planSet = new Set(planModules);

    return this.manifests.flatMap((manifest) => {
      const explicitStatus = statuses.get(manifest.code);
      const status: ModuleStatus | undefined = manifest.isCore
        ? 'enabled'
        : explicitStatus ?? (planSet.has(manifest.code) ? 'enabled' : undefined);

      if (status === undefined || status === 'disabled') return [];
      return [{ ...manifest, status }];
    });
  }

  /** Catálogo completo (super-admin). */
  listCatalog(): ModuleManifest[] {
    return this.manifests;
  }

  async setModuleEnabled(
    companyId: string,
    moduleCode: string,
    enabled: boolean,
  ): Promise<{ code: string; status: ModuleStatus }> {
    const manifest = this.manifests.find((item) => item.code === moduleCode);
    if (!manifest) throw new NotFoundException('Módulo no encontrado');
    if (manifest.isCore) {
      throw new BadRequestException('Los módulos core siempre están habilitados');
    }

    const statuses = await this.repository.getCompanyModuleStatuses(companyId);

    if (enabled) {
      this.assertDependenciesEnabled(manifest, statuses);
    } else {
      this.assertNoEnabledDependents(manifest, statuses);
    }

    const status = await this.repository.setCompanyModule(companyId, moduleCode, enabled);
    return { code: moduleCode, status };
  }

  private assertDependenciesEnabled(
    manifest: ModuleManifest,
    statuses: Map<string, ModuleStatus>,
  ): void {
    for (const dependency of manifest.dependsOn) {
      const dependencyManifest = this.manifests.find((item) => item.code === dependency);
      if (!dependencyManifest) {
        throw new BadRequestException(`Dependencia desconocida: ${dependency}`);
      }
      if (dependencyManifest.isCore) continue;

      const status = statuses.get(dependency);
      if (status !== 'enabled' && status !== 'trial' && status !== 'read_only') {
        throw new BadRequestException(
          `El módulo requiere "${dependency}" habilitado primero`,
        );
      }
      this.assertDependenciesEnabled(dependencyManifest, statuses);
    }
  }

  private assertNoEnabledDependents(
    manifest: ModuleManifest,
    statuses: Map<string, ModuleStatus>,
  ): void {
    const dependents = this.manifests.filter(
      (item) =>
        !item.isCore &&
        item.dependsOn.includes(manifest.code) &&
        ['enabled', 'trial', 'read_only'].includes(statuses.get(item.code) ?? ''),
    );

    if (dependents.length > 0) {
      throw new BadRequestException(
        `No se puede deshabilitar: depende de él ${dependents.map((d) => d.code).join(', ')}`,
      );
    }
  }
}
