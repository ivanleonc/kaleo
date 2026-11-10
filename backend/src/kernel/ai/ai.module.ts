import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';
import { AuditLogModule } from '../../audit/audit-log.module.js';

@Module({
  imports: [AuditLogModule],
  controllers: [AiController],
  providers: [AiRepository, AiService],
  exports: [AiService],
})
export class AiModule {}
