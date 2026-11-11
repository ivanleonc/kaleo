import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';
import { ProjectSharesController } from './project-shares.controller.js';
import { ProjectSharePublicController } from './project-share-public.controller.js';
import { ProjectSharesRepository } from './project-shares.repository.js';
import { ProjectSharesService } from './project-shares.service.js';
import { EntitlementModule } from '../kernel/billing/entitlement.module.js';

@Module({
  imports: [EntitlementModule],
  controllers: [ProjectsController, ProjectSharesController, ProjectSharePublicController],
  providers: [
    ProjectsRepository,
    ProjectsService,
    ProjectSharesRepository,
    ProjectSharesService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
