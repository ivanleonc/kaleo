# Variables de entorno

## Backend

Las variables se cargan en orden de prioridad:
1. `.env.${NODE_ENV}` (ej: `.env.development`)
2. `.env` (fallback local)
3. Variables del sistema/hosting (Render, etc.)

### Variables obligatorias

El servidor **falla al arrancar** si alguna de estas no está definida:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL. Usar el **transaction pooler** de Supabase en puerto `6543`. | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | Clave para firmar tokens JWT. Mínimo 32 caracteres aleatorios. **Distinta por ambiente.** | `2ywL+LP03l4od4...` |
| `CORS_ORIGIN` | Origen(es) del frontend, coma-separados. Sin esto el servidor rechaza los requests. | `http://localhost:5173` |
| `FRONTEND_URL` | URL base del frontend. Se usa en los enlaces de correos. | `http://localhost:5173` |

### Variables opcionales

| Variable | Default | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Afecta modo de email y nivel de logs. Valores: `development`, `production`. |
| `PORT` | `3000` | Puerto del servidor. En Render/hosting lo inyecta el sistema. |
| `SWAGGER_ENABLED` | `false` | `'true'` expone `/api/docs` con Swagger UI. Solo en development. |
| `SWAGGER_USER` | — | Usuario para Basic Auth de Swagger. |
| `SWAGGER_PASSWORD` | — | Contraseña para Basic Auth de Swagger. |
| `LOG_LEVEL` | Auto por NODE_ENV | Nivel pino: `debug` (dev) / `info` (prod). |

### Email transaccional

Kaleo elige el proveedor en este orden: **Brevo API → SMTP → Stub**.

| Variable | Descripción |
|---|---|
| `BREVO_API_KEY` | API Key de Brevo. Puerto 443, recomendado en hosting. |
| `SMTP_HOST` | Host SMTP alternativo (ej: `smtp-relay.brevo.com`). |
| `SMTP_PORT` | Puerto SMTP (ej: `587`). |
| `SMTP_SECURE` | `true` para TLS. |
| `SMTP_USER` | Usuario SMTP. |
| `SMTP_PASS` | Contraseña SMTP. |
| `EMAIL_FROM` | Remitente visible. Debe estar verificado en el proveedor. Ej: `Kaleo <hola@tudominio.com>` |

::: warning
Sin `BREVO_API_KEY` ni config SMTP, en **producción** el stub lanza un error (no finge éxito silencioso). En desarrollo, el stub loguea el email en consola.
:::

### Observabilidad

| Variable | Descripción |
|---|---|
| `SENTRY_DSN` | DSN del proyecto NestJS en sentry.io. Sin esta variable, Sentry queda desactivado. |
| `APP_VERSION` | Versión para agrupar eventos en Sentry. Ej: `1.0.0`. |

## Frontend

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_API_URL` | ✅ En producción | URL base del backend. En dev hace fallback a `http://localhost:3000/api`. |

## Archivos por ambiente

| Archivo | Ambiente | Comando |
|---|---|---|
| `backend/.env.development` | Desarrollo (`kaleo-dev`) | `npm run dev` |
| `backend/.env.production` | Producción local (`kaleo-prod`) | `npm run dev:prod` |
| `backend/.env` | Fallback personal | Cualquier comando |
| `frontend/.env.development` | Desarrollo | `npm run dev` |

::: danger
Ningún archivo `.env` se sube a Git — están en `.gitignore`. Nunca copies credenciales entre ambientes. Cada ambiente tiene su propio `JWT_SECRET`.
:::

## Ejemplo de `.env.development` completo

```bash
# Backend — kaleo-dev (Supabase ca-central-1)
DATABASE_URL="postgresql://postgres.eojvdahwaihuwrhdgloc:TU_PASSWORD@aws-0-ca-central-1.pooler.supabase.com:6543/postgres"
JWT_SECRET=TU_SECRET_LARGO_Y_ALEATORIO_AQUI
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Swagger (solo en dev)
SWAGGER_ENABLED=true
SWAGGER_USER=dev
SWAGGER_PASSWORD=TU_CLAVE_SWAGGER

# Email (opcional en dev — sin esto se usa el stub que loguea en consola)
# BREVO_API_KEY=xkeysib-tu-clave
# EMAIL_FROM=Kaleo <dev@tudominio.com>
```
