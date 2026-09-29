import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private transporterChecked = false;

  constructor(private configService: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporterChecked) return this.transporter;
    this.transporterChecked = true;

    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) return null;

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

  async sendViaBrevoApi(options: EmailOptions): Promise<boolean> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) return false;

    const from = this.parseSender(
      this.configService.get<string>('EMAIL_FROM') || 'no-reply@localhost',
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
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
        this.logger.warn(`[EmailService] Email sending not configured in production. To: ${options.to}, Subject: ${options.subject}`);
        return;
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
    await this.send({
      to: email,
      subject: 'Recuperación de contraseña - SaaS',
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Tu token de recuperación (válido por 15 minutos):</p>
        <code style="background:#f4f4f4;padding:8px 16px;border-radius:4px;font-size:16px">${resetToken}</code>
        <p>O haz clic en el siguiente enlace:</p>
        <a href="${frontendUrl}/reset-password?token=${resetToken}&email=${email}">Restablecer contraseña</a>
        <p>Si no solicitaste este cambio, ignora este email.</p>
      `,
    });
  }

  async sendEmailVerification(email: string, verificationToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    await this.send({
      to: email,
      subject: 'Verifica tu email - SaaS',
      html: `
        <h2>Bienvenido al SaaS</h2>
        <p>Gracias por registrarte. Para activar tu cuenta, verifica tu email.</p>
        <a href="${frontendUrl}/verify-email?token=${verificationToken}" style="background:#007bff;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block">Verificar email</a>
        <p>O usa este código: <code>${verificationToken}</code></p>
      `,
    });
  }

  async sendTemporaryPassword(email: string, tempPassword: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    await this.send({
      to: email,
      subject: 'Tu contraseña temporal - SaaS',
      html: `
        <h2>Tu contraseña temporal ha sido generada</h2>
        <p>Un administrador ha restablecido tu contraseña. Tu nueva contraseña temporal es:</p>
        <code style="background:#f4f4f4;padding:8px 16px;border-radius:4px;font-size:16px">${tempPassword}</code>
        <p>Por seguridad, deberás cambiar esta contraseña en tu próximo inicio de sesión.</p>
        <p><a href="${frontendUrl}/login" style="background:#007bff;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block">Iniciar sesión</a></p>
        <p>Si no solicitaste este cambio, contacta al administrador de tu organización.</p>
      `,
    });
  }
}
