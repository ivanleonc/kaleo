import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  passwordResetTemplate,
  emailVerificationTemplate,
  temporaryPasswordTemplate,
} from './templates.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export type EmailMode = 'brevo-api' | 'smtp' | 'stub';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private transporterChecked = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const mode = this.getMode();
    if (mode === 'stub') {
      this.logger.warn('[EmailService] Sin proveedor configurado: los correos solo se simulan en logs.');
    } else {
      this.logger.log(`[EmailService] Modo de envío: ${mode}`);
    }
  }

  /** Cómo se enviarán los correos según las env presentes. */
  getMode(): EmailMode {
    if (this.configService.get<string>('BREVO_API_KEY')) return 'brevo-api';
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    if (host && user && pass) return 'smtp';
    return 'stub';
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporterChecked) return this.transporter;
    this.transporterChecked = true;

    if (this.getMode() !== 'smtp') return null;

    const host = this.configService.get<string>('SMTP_HOST')!;
    const user = this.configService.get<string>('SMTP_USER')!;
    const pass = this.configService.get<string>('SMTP_PASS')!;
    const port = Number(this.configService.get<string>('SMTP_PORT') || '587');
    const secure = (this.configService.get<string>('SMTP_SECURE') || 'false') === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return this.transporter;
  }

  private parseSender(from: string): { email: string; name?: string } {
    const match = from.match(/^(.*)<([^<>]+)>$/);
    if (match) {
      const name = match[1].trim().replace(/^["']|["']$/g, '');
      return name ? { email: match[2].trim(), name } : { email: match[2].trim() };
    }
    return { email: from.trim() };
  }

  private async postWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
    try {
      const response = await fetch(url, init);
      if (!response.ok && response.status >= 500 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.postWithRetry(url, init, retries - 1);
      }
      return response;
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.postWithRetry(url, init, retries - 1);
      }
      throw error;
    }
  }

  private async sendViaBrevoApi(options: EmailOptions): Promise<boolean> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) return false;

    const from = this.parseSender(
      this.configService.get<string>('EMAIL_FROM') || 'no-reply@localhost',
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.postWithRetry(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: from,
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Brevo API ${response.status}: ${body.slice(0, 200)}`);
      }

      this.logger.log(`Email enviado a ${options.to} vía Brevo API: ${options.subject}`);
      return true;
    } finally {
      clearTimeout(timeout);
    }
  }

  async send(options: EmailOptions): Promise<void> {
    // 1. API HTTP de Brevo (puerto 443, no la filtran los hostings)
    try {
      const sent = await this.sendViaBrevoApi(options);
      if (sent) return;
    } catch (error: any) {
      this.logger.error(`Fallo el envío a ${options.to} vía Brevo API: ${error.message}`);
      throw new InternalServerErrorException('No se pudo enviar el correo. Intenta de nuevo.');
    }

    // 2. SMTP clásico (puede estar filtrado según el host)
    const transporter = this.getTransporter();

    if (!transporter) {
      const env = this.configService.get<string>('NODE_ENV');
      if (env === 'production') {
        // En producción sin proveedor configurado NO fingimos éxito: lanzamos
        // error para que el llamador sepa que el correo no se envió.
        // (El stub silencioso era la causa de "contraseña rotada pero email
        // nunca llegó y la API reportaba 200".)
        this.logger.error(
          `[EmailService] Sin proveedor configurado en producción. ` +
          `Correo a ${options.to} ('${options.subject}') NO enviado.`,
        );
        throw new InternalServerErrorException(
          'El servicio de correo no está configurado. Contacta al administrador.',
        );
      }
      this.logger.log(`[DEV EMAIL] To: ${options.to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${options.subject}`);
      this.logger.log(`[DEV EMAIL] Body: ${options.html}`);
      return;
    }

    const from = this.configService.get<string>('EMAIL_FROM') || 'no-reply@localhost';
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT') || '587';

    try {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email enviado a ${options.to}: ${options.subject}`);
    } catch (error: any) {
      this.logger.error(
        `Fallo el envío a ${options.to} vía ${host}:${port}: ${error.message} (code: ${error.code || 'N/A'})`,
      );
      throw new InternalServerErrorException('No se pudo enviar el correo. Intenta de nuevo.');
    }
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    // encodeURIComponent: un email con `+`, `&` o `#` rompería la URL sin esto.
    const { subject, html } = passwordResetTemplate(
      resetToken,
      `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`,
    );
    await this.send({ to: email, subject, html });
  }

  async sendEmailVerification(email: string, verificationToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const { subject, html } = emailVerificationTemplate(
      `${frontendUrl}/verify-email?token=${verificationToken}`,
      verificationToken,
    );
    await this.send({ to: email, subject, html });
  }

  async sendTemporaryPassword(email: string, tempPassword: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const { subject, html } = temporaryPasswordTemplate(
      tempPassword,
      `${frontendUrl}/login`,
    );
    await this.send({ to: email, subject, html });
  }
}
