import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller.js';
import { BudgetsRepository } from './budgets.repository.js';
import { BudgetsService } from './budgets.service.js';
import { TakeoffController } from './takeoff.controller.js';
import { TakeoffRepository } from './takeoff.repository.js';
import { TakeoffService } from './takeoff.service.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { EstimatingModule } from '../estimating/estimating.module.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';
import { ExportModule } from '../common/export/export.module.js';

@Module({
  imports: [ProjectsModule, EstimatingModule, EntitlementModule, ExportModule],
  controllers: [BudgetsController, TakeoffController],
  providers: [BudgetsRepository, BudgetsService, TakeoffRepository, TakeoffService],
  exports: [BudgetsService, TakeoffService],
})
export class BudgetsModule {}
