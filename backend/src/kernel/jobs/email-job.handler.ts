import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailService } from '../../email/email.service.js';
import { JobsService } from './jobs.service.js';
import type { JobRow } from './jobs.types.js';

export const EMAIL_SEND_QUEUE = 'email.send';

interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailJobHandler implements OnModuleInit {
  private readonly logger = new Logger(EmailJobHandler.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly email: EmailService,
  ) {}

  onModuleInit(): void {
    this.jobs.registerHandler(EMAIL_SEND_QUEUE, (job) => this.handle(job));
  }

  private async handle(job: JobRow): Promise<void> {
    const payload = job.payload as Partial<EmailJobPayload>;
    if (
      typeof payload.to !== 'string' ||
      typeof payload.subject !== 'string' ||
      typeof payload.html !== 'string'
    ) {
      throw new Error('Payload email.send inválido: se requieren to, subject y html');
    }

    await this.email.send({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    this.logger.debug(`Email enviado por job ${job.id} a ${payload.to}`);
  }
}
