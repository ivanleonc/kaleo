import { Module } from '@nestjs/common';
import { EntitlementController } from './entitlement.controller.js';
import { EntitlementRepository } from './entitlement.repository.js';
import { EntitlementService } from './entitlement.service.js';
import { PlanAdminController } from './plan.controller.js';
import { PlanRepository } from './plan.repository.js';
import { PlanService } from './plan.service.js';

@Module({
  controllers: [EntitlementController, PlanAdminController],
  providers: [EntitlementRepository, EntitlementService, PlanRepository, PlanService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
