/**
 * Plantillas HTML de correos transaccionales.
 * Funciones puras (sin dependencias) para poder testearlas.
 * El layout compartido mantiene marca y pie consistentes.
 */
import { BRAND_NAME } from '../common/constants/brand.js';

export function emailLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">Mensaje automático, por favor no respondas a este correo.</p>
  </div>
</body>
</html>`;
}

function primaryButton(url: string, label: string): string {
  return `<p><a href="${url}" style="background:#007bff;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block">${label}</a></p>`;
}

function codeBlock(value: string): string {
  return `<code style="background:#f4f4f4;padding:8px 16px;border-radius:4px;font-size:16px">${value}</code>`;
}

export function passwordResetTemplate(resetToken: string, url: string): { subject: string; html: string } {
  return {
    subject: `Recuperación de contraseña - ${BRAND_NAME}`,
    html: emailLayout(
      'Recuperación de contraseña',
      `<h2>Recuperación de contraseña</h2>
       <p>Has solicitado restablecer tu contraseña.</p>
       <p>Tu token de recuperación (válido por 15 minutos):</p>
       <p>${codeBlock(resetToken)}</p>
       <p>O haz clic en el siguiente enlace:</p>
       ${primaryButton(url, 'Restablecer contraseña')}
       <p>Si no solicitaste este cambio, ignora este email.</p>`,
    ),
  };
}

export function emailVerificationTemplate(url: string, verificationToken: string): { subject: string; html: string } {
  return {
    subject: `Verifica tu email - ${BRAND_NAME}`,
    html: emailLayout(
      'Verifica tu email',
      `<h2>Bienvenido a ${BRAND_NAME}</h2>
       <p>Gracias por registrarte. Para activar tu cuenta, verifica tu email.</p>
       ${primaryButton(url, 'Verificar email')}
       <p>O usa este código: ${codeBlock(verificationToken)}</p>`,
    ),
  };
}

export function invitationTemplate(companyName: string, invitationUrl: string): { subject: string; html: string } {
  return {
    subject: `Invitación a ${companyName} - ${BRAND_NAME}`,
    html: emailLayout(
      'Invitación',
      `<h2>Te invitaron a ${companyName}</h2>
       <p>Has sido invitado a unirte a <strong>${companyName}</strong> en ${BRAND_NAME}.</p>
       ${primaryButton(invitationUrl, 'Aceptar invitación')}
       <p>La invitación vence en 7 días.</p>
       <p>Si no esperabas esta invitación, ignora este correo.</p>`,
    ),
  };
}

export function notificationTemplate(
  title: string,
  body?: string | null,
  url?: string | null,
): { subject: string; html: string } {
  const safeTitle = escapeHtml(title);
  const safeBody = body ? escapeHtml(body) : '';
  return {
    subject: `${title} - ${BRAND_NAME}`,
    html: emailLayout(
      safeTitle,
      `<h2>${safeTitle}</h2>
       ${safeBody ? `<p>${safeBody}</p>` : ''}
       ${url ? primaryButton(url, 'Abrir en Kaleo') : ''}
       <p>Puedes gestionar tus preferencias de notificaciones desde tu perfil.</p>`,
    ),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function temporaryPasswordTemplate(tempPassword: string, loginUrl: string): { subject: string; html: string } {
  return {
    subject: `Tu contraseña temporal - ${BRAND_NAME}`,
    html: emailLayout(
      'Contraseña temporal',
      `<h2>Tu contraseña temporal ha sido generada</h2>
       <p>Un administrador ha restablecido tu contraseña. Tu nueva contraseña temporal es:</p>
       <p>${codeBlock(tempPassword)}</p>
       <p>Por seguridad, deberás cambiar esta contraseña en tu próximo inicio de sesión.</p>
       ${primaryButton(loginUrl, 'Iniciar sesión')}
       <p>Si no solicitaste este cambio, contacta al administrador de tu organización.</p>`,
    ),
  };
}
