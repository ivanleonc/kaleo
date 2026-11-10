import { Module } from '@nestjs/common';
import { ModuleRegistryController } from './module-registry.controller.js';
import { ModuleRegistryRepository } from './module-registry.repository.js';
import { ModuleRegistryService } from './module-registry.service.js';
import { MODULE_MANIFESTS, MODULE_MANIFESTS_TOKEN } from './module-manifests.js';

@Module({
  controllers: [ModuleRegistryController],
  providers: [
    ModuleRegistryRepository,
    ModuleRegistryService,
    { provide: MODULE_MANIFESTS_TOKEN, useValue: MODULE_MANIFESTS },
  ],
  exports: [ModuleRegistryService],
})
export class ModuleRegistryModule {}
