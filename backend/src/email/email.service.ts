import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async send(options: EmailOptions): Promise<void> {
    const env = this.configService.get<string>('NODE_ENV');

    if (env === 'production') {
      this.logger.warn(`[EmailService] Email sending not configured in production. To: ${options.to}, Subject: ${options.subject}`);
      return;
    }

    this.logger.log(`[DEV EMAIL] To: ${options.to}`);
    this.logger.log(`[DEV EMAIL] Subject: ${options.subject}`);
    this.logger.log(`[DEV EMAIL] Body: ${options.html}`);
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
