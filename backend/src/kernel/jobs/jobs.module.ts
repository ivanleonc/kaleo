import { Global, Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsWorker } from './jobs.worker.js';
import { EmailJobHandler } from './email-job.handler.js';

@Global()
@Module({
  providers: [JobsService, JobsWorker, EmailJobHandler],
  exports: [JobsService],
})
export class JobsModule {}
