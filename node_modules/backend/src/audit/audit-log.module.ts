import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogRepository } from './audit-log.repository.js';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { AuditController } from './audit.controller.js';
import { AuditRetentionService } from './audit-retention.service.js';

@Global()
@Module({
  imports: [TypeOrmModule],
  controllers: [AuditController],
  providers: [AuditLogService, AuditLogRepository, AuditLogInterceptor, AuditRetentionService],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogModule {}
