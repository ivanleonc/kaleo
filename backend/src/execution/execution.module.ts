import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller.js';
import { ExecutionRepository } from './execution.repository.js';
import { ExecutionService } from './execution.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [ExecutionController],
  providers: [ExecutionRepository, ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
