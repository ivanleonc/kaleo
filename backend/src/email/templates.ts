/**
 * Plantillas HTML de correos transaccionales.
 * Funciones puras (sin dependencias) para poder testearlas.
 * El layout compartido mantiene marca y pie consistentes.
 */

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
    subject: 'Recuperación de contraseña - SaaS',
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
    subject: 'Verifica tu email - SaaS',
    html: emailLayout(
      'Verifica tu email',
      `<h2>Bienvenido al SaaS</h2>
       <p>Gracias por registrarte. Para activar tu cuenta, verifica tu email.</p>
       ${primaryButton(url, 'Verificar email')}
       <p>O usa este código: ${codeBlock(verificationToken)}</p>`,
    ),
  };
}

export function temporaryPasswordTemplate(tempPassword: string, loginUrl: string): { subject: string; html: string } {
  return {
    subject: 'Tu contraseña temporal - SaaS',
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
