import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller.js';
import { BudgetsRepository } from './budgets.repository.js';
import { BudgetsService } from './budgets.service.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { EstimatingModule } from '../estimating/estimating.module.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [ProjectsModule, EstimatingModule, EntitlementModule],
  controllers: [BudgetsController],
  providers: [BudgetsRepository, BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
