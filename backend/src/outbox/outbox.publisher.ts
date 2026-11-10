import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxService } from './outbox.service.js';

const INTERVAL_MS = 5000;

/**
 * Publicador periódico del outbox. En una sola instancia es suficiente;
 * `FOR UPDATE SKIP LOCKED` permite escalar a varias sin duplicar eventos.
 */
@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly outbox: OutboxService) {}

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
      await this.outbox.publishPending();
    } catch (error) {
      this.logger.error(`Outbox publisher falló: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
