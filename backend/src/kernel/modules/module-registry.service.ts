import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRegistryRepository } from './module-registry.repository.js';
import { MODULE_MANIFESTS, MODULE_MANIFESTS_TOKEN } from './module-manifests.js';
import { validateManifests } from './module-manifest.validator.js';
import type { EnabledModule, ModuleManifest, ModuleStatus } from './module-manifest.types.js';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModuleRegistryService.name);

  constructor(
    private readonly repository: ModuleRegistryRepository,
    @Inject(MODULE_MANIFESTS_TOKEN) private readonly manifests: ModuleManifest[] = MODULE_MANIFESTS,
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
    const statuses = await this.repository.getCompanyModuleStatuses(companyId);

    return this.manifests.flatMap((manifest) => {
      const status: ModuleStatus | undefined = manifest.isCore
        ? 'enabled'
        : statuses.get(manifest.code);

      if (status === undefined || status === 'disabled') return [];
      return [{ ...manifest, status }];
    });
  }
}
