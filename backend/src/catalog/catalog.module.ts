import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [CatalogController],
  providers: [CatalogRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
