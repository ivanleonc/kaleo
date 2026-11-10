import { Module } from '@nestjs/common';
import { EntitlementController } from './entitlement.controller.js';
import { EntitlementRepository } from './entitlement.repository.js';
import { EntitlementService } from './entitlement.service.js';

@Module({
  controllers: [EntitlementController],
  providers: [EntitlementRepository, EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
