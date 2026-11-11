import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller.js';
import { OperationsRepository } from './operations.repository.js';
import { OperationsService } from './operations.service.js';
import { OperationsJobHandler } from './operations-job.handler.js';
import { BranchImportParser } from './branch-import.parser.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { MemberModule } from '../../members/member.module.js';
import { BranchesModule } from '../../branches/branches.module.js';
import { AnalysesModule } from '../../analyses/analyses.module.js';
import { AuditLogModule } from '../../audit/audit-log.module.js';
import { NotificationsModule } from '../../notifications/notifications.module.js';

@Module({
  imports: [
    JobsModule,
    MemberModule,
    BranchesModule,
    AnalysesModule,
    AuditLogModule,
    NotificationsModule,
  ],
  controllers: [OperationsController],
  providers: [OperationsRepository, OperationsService, OperationsJobHandler, BranchImportParser],
  exports: [OperationsService],
})
export class OperationsModule {}
