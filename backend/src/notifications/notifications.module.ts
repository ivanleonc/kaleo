import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';
import { JobsModule } from '../kernel/jobs/jobs.module.js';

@Module({
  imports: [JobsModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
