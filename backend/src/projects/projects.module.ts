import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
