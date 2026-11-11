import { Module } from '@nestjs/common';
import { EstimatingController } from './estimating.controller.js';
import { EstimatingRepository } from './estimating.repository.js';
import { EstimatingService } from './estimating.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [EstimatingController],
  providers: [EstimatingRepository, EstimatingService],
  exports: [EstimatingService],
})
export class EstimatingModule {}
