import { Module } from '@nestjs/common';
import { PartiesController } from './parties.controller.js';
import { PartiesRepository } from './parties.repository.js';
import { PartiesService } from './parties.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [PartiesController],
  providers: [PartiesRepository, PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
