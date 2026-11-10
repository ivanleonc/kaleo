import { Global, Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsWorker } from './jobs.worker.js';
import { EmailJobHandler } from './email-job.handler.js';
import { JobsRetentionService } from './jobs-retention.service.js';

@Global()
@Module({
  providers: [JobsService, JobsWorker, EmailJobHandler, JobsRetentionService],
  exports: [JobsService],
})
export class JobsModule {}
