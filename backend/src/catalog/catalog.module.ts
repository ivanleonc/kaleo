import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogItemsController } from './items.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogItemsRepository } from './items.repository.js';
import { CatalogService } from './catalog.service.js';
import { CatalogItemsService } from './items.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [CatalogController, CatalogItemsController],
  providers: [
    CatalogRepository,
    CatalogService,
    CatalogItemsRepository,
    CatalogItemsService,
  ],
  exports: [CatalogService, CatalogItemsService],
})
export class CatalogModule {}
