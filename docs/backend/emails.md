# Emails

Kaleo envía emails transaccionales a través de una cadena de adaptadores. El sistema elige el primero disponible según las variables de entorno.

## Cadena de adaptadores

```
1. Brevo API      → Si BREVO_API_KEY está definida
2. SMTP clásico   → Si SMTP_HOST está definido
3. Stub           → Siempre disponible como fallback
```

Al arrancar, el servicio loguea su modo activo:

```
[EmailService] Modo de envío: brevo-api
[EmailService] Modo de envío: smtp
[EmailService] Modo de envío: stub
```

## Brevo API (recomendado en producción)

**Ventajas:**
- Usa puerto **443** (HTTPS) — nunca filtrado por hostings como Render
- Reintenta automáticamente 1 vez en errores 5xx o de red
- No requiere configuración SMTP compleja

**Configuración:**

```bash
BREVO_API_KEY=xkeysib-tu-clave-real
EMAIL_FROM=Kaleo <hola@tudominio.com>
```

## SMTP clásico

**Cuándo usarlo:** Si tienes un SMTP propio y no usas Brevo.

::: warning
En Render y otros hostings compartidos, el puerto SMTP (587, 465) puede estar **bloqueado**. Usa Brevo API en su lugar para evitar problemas de entrega.
:::

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@email.com
SMTP_PASS=tu-clave-smtp
EMAIL_FROM=Kaleo <hola@tudominio.com>
```

## Stub (desarrollo)

**En `NODE_ENV=development`:** Loguea el email en consola con todos sus datos (destinatario, asunto, HTML). No envía nada.

**En `NODE_ENV=production`:** Lanza `InternalServerErrorException`. No finge éxito silencioso — así siempre sabes que el email no se envió.

## Emails activos

| Email | Cuándo se envía | Token / Link |
|---|---|---|
| **Contraseña temporal** | Al invitar un miembro o resetear su contraseña | Contraseña en texto plano en el cuerpo |
| **Recuperación de contraseña** | Al llamar `/api/auth/forgot-password` | Link JWT con expiración de 15 minutos |
| **Verificación de email** | Al cambiar el email del perfil | Token con expiración de 24 horas |

::: danger Seguridad
Los tokens y contraseñas **nunca se loguean** — ni en consola ni en el audit log. Solo se loguean: destinatario y asunto.
:::

## Agregar un nuevo email

### 1. Agregar la plantilla

```ts
// backend/src/email/templates.ts
export function myNewEmailTemplate(data: { name: string; link: string }) {
  return {
    subject: 'Asunto del email',
    html: `
      <h1>Hola ${data.name}</h1>
      <p><a href="${data.link}">Haz clic aquí</a></p>
    `,
  }
}
```

### 2. Agregar el método en EmailService

```ts
// backend/src/email/email.service.ts
async sendMyNewEmail(to: string, data: { name: string; link: string }) {
  const { subject, html } = myNewEmailTemplate(data)
  await this.send({ to, subject, html })
  // this.send() maneja automáticamente la cadena Brevo → SMTP → Stub
}
```

### 3. Inyectar y usar en el servicio que lo necesita

```ts
constructor(private emailService: EmailService) {}

async someAction(user: UserRow) {
  await this.emailService.sendMyNewEmail(user.email, {
    name: user.name,
    link: `${process.env.FRONTEND_URL}/some-path?token=...`,
  })
}
```

## `EMAIL_FROM` — formato

```bash
# Nombre + email (recomendado)
EMAIL_FROM=Kaleo <hola@tudominio.com>

# Solo email
EMAIL_FROM=hola@tudominio.com
```

::: warning
El remitente debe estar **verificado** en Brevo (o en tu proveedor SMTP) antes de poder enviar. Los emails con remitentes no verificados son rechazados o van a spam.
:::
