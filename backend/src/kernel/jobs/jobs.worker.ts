import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

const INTERVAL_MS = 5000;

@Injectable()
export class JobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly jobs: JobsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.jobs.runPending();
    } catch (error) {
      this.logger.error(`Jobs worker falló: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
