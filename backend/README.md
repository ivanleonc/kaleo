# Backend — API SaaS multi-tenant

API REST con **NestJS 12 + ESM** (`"type": "module"`), **TypeORM + PostgreSQL** (Supabase) y **JWT** con access (15 min) + refresh (7 días) por tokens.

## Requisitos

- Node.js `>=22 <25` (ver `engines` en `package.json`), npm 10+
- PostgreSQL via Supabase. Un proyecto por ambiente: sandbox, staging, prod.

## Instalación

```powershell
cd backend
npm install
```

## Variables de entorno

Nunca se commitean (`.gitignore` las cubre). Hay un archivo por objetivo:

| Archivo | Cuándo se usa | Comando |
|---|---|---|
| `.env` | Default local | `npm run dev` |
| `.env.sandbox` | Desarrollo con BD limpia | `npm run dev:sandbox` |
| `.env.staging` | Probar contra staging | `npm run dev:staging` |
| `.env.prod` | Migraciones a prod (local, nunca en Render) | `npm run migrate -- prod` |
| Render dashboard | Producción en vivo | (sin archivo) |

Copia `.env.example` como punto de partida. Las variables obligatorias para arrancar:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | ✅ | Conexión Postgres. En nube: pooler Supabase `:6543` |
| `JWT_SECRET` | ✅ | Firma de tokens. **Distinto por ambiente.** Rotarlo cierra todas las sesiones |
| `CORS_ORIGIN` | ✅ | Dominio(s) exacto(s) del frontend, coma-separados. Sin esto el servidor no arranca |
| `FRONTEND_URL` | ✅ | URL base del frontend (se usa en los enlaces de los correos) |
| `PORT` | — | Lo inyecta el host; default `3000` en local |
| `NODE_ENV` | — | `development` / `production`. Afecta al modo del stub de email y nivel de logs |
| `SWAGGER_ENABLED` | — | `'true'` para exponer `/api/docs`. Por defecto apagado |
| `SWAGGER_USER` / `SWAGGER_PASSWORD` | — | Basic Auth de la documentación (si está encendida) |
| `BREVO_API_KEY` | — | Proveedor de email principal (puerto 443, recomendado en Render) |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | — | Proveedor SMTP alternativo |
| `EMAIL_FROM` | — | Remitente visible. Debe estar verificado en el proveedor |
| `SENTRY_DSN` | — | DSN del proyecto NestJS en sentry.io (opt-in, sin él no hay telemetría) |
| `APP_VERSION` | — | Release para agrupar eventos de Sentry |
| `LOG_LEVEL` | — | Nivel de logs pino: `debug` (dev) / `info` (prod). Default: automático por `NODE_ENV` |

## Scripts

### Arranque en local

| Comando | Usa el archivo | Base de datos | Uso |
|---|---|---|---|
| `npm run dev` | `.env` | Según tu `.env` local | Solo si personalizaste tu `.env` |
| `npm run dev:sandbox` | `.env.sandbox` | `saas-sandbox` | Desarrollo diario (recomendado) |
| `npm run dev:staging` | `.env.staging` | `saas-staging` (datos reales) | Depurar producción en local |
| `npm run start:prod` | Variables del host | La de producción | Arranque de producción (`node dist/main.js`) |

> Tip: desde la raíz del proyecto puedes levantar backend + frontend juntos con `npm run dev:sandbox` o `npm run dev:staging` (ver README raíz).

### Calidad y utilidades

| Comando | Uso |
|---|---|
| `npm run build` | Compila a `dist/` (lo corre Render en producción) |
| `npm run typecheck` | `tsc --noEmit` — **correr antes de cada push** |
| `npm run lint` | `oxlint --type-aware src/ test/` |
| `npm test` | Vitest (85 tests) |
| `npm run migrate -- <entorno>` | Aplica migraciones usando `.env.<entorno>` |
| `npm run migrate -- <entorno> --status` | Lista el estado de migraciones |
| `npm run seed:owner -- <entorno> <email> <nombre> <empresa>` | Crea el primer Owner en un ambiente vacío |

## Base de datos y migraciones

SQL plano en `src/migrations/`, aplicado **a mano en el SQL editor de Supabase**.

### Orden de aplicación (siempre de menor a mayor)
```
000 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010
→ 011 → 012 → 013 → 014 → 015 → 016
```
(No existe `001`.)

### Verificar qué está aplicado
```sql
SELECT version FROM schema_migrations ORDER BY version;
```

### Reglas
- **Nunca editar** una migración ya aplicada — crear un nuevo archivo numerado.
- `000` representa el esquema completo; es re-ejecutable sin errores.
- `audit_logs` es **particionada por rango** (`y2026h2`, `y2027`, `default`): los `ALTER TABLE` van solo a la tabla padre, nunca a las particiones.
- Probar siempre en sandbox → staging → prod.

### Runner automatizado (opcional)
```powershell
# Listar estado (no aplica nada):
npm run migrate -- staging --status

# Aplicar todas las pendientes:
npm run migrate -- staging

# Aplicar solo una:
npm run migrate -- staging --only 015-add-email-verification-expiry.sql
```
Requiere `.env.<entorno>` con `DATABASE_URL`.

## Arquitectura

```
src/
├── auth/
│   ├── strategies/         → JwtStrategy (verifica blacklist en cada request)
│   ├── guards/             → JwtAuthGuard, PasswordChangedGuard
│   ├── repositories/       → user, refresh-token, token-blacklist, password-history
│   ├── utils/              → password-validator.ts (política única: 8+, mayús+min+num)
│   ├── registration.service.ts  → registro con transacción atómica (user + refresh token)
│   ├── session.service.ts       → login, logout, refresh, cambio de email, perfil
│   └── password.service.ts      → cambio/reset de contraseña con transacciones atómicas
│
├── members/                → Altas (por email, contraseña temporal), roles, estados, reseteo
├── company/                → Empresas, tenancy, companyAccessGuard
├── branches/               → Sedes paginadas, soft-delete, is_main guard
├── rbac/                   → Roles y permisos (scoped por empresa, anti-IDOR)
├── audit/                  → Interceptor global, repositorio particionado, retención 365d, CSV
├── email/                  → Brevo API → SMTP → stub (stub lanza error en producción)
│
├── common/
│   ├── constants/          → permissions.ts y roles.ts (fuente de verdad RBAC)
│   ├── decorators/         → @Public, @RequirePermissions, @Roles, @Audit, @CurrentUser
│   ├── dto/                → api-response, pagination-query (SortQueryDto, buildOrderBy)
│   ├── filters/            → SentryExceptionFilter (global, captura 5xx, envía a Sentry)
│   ├── guards/             → PermissionsGuard, RolesGuard, CompanyAccessGuard
│   ├── middleware/         → RequestLoggerMiddleware (request-id + logs pino JSON)
│   └── utils/              → crypto (sha256), sql.helper, membership.helper
│
├── migrations/             → SQL versionado (000–016)
├── app.module.ts           → Módulo raíz: guards globales, interceptores, middleware
├── app.controller.ts       → GET / (Hello World) + GET /health (BD check)
├── app.service.ts          → HealthStatus con timeout de 5s
└── main.ts                 → Bootstrap: validación de env, Sentry init, CORS, filtro global
```

### Guards en orden de ejecución (todos globales)
1. `ThrottlerGuard` — 30 req/min global; endpoints de auth tienen límites propios más estrictos
2. `JwtAuthGuard` — verifica Bearer token **y blacklist** en cada request autenticado; `@Public()` exime
3. `PasswordChangedGuard` — bloquea todo si `must_change_password = true`; `@SkipPasswordChanged()` exime
4. `CompanyAccessGuard` — verifica que el usuario pertenezca a la empresa del `x-company-id` header (o sea super-admin: acceso virtual sin membresía)

### Sistema RBAC

| Rol | Qué puede hacer |
|---|---|
| `Owner` | Todo **dentro de su empresa** — inmutable, no se pueden cambiar sus permisos |
| `Admin` | Todo excepto gestión de roles y borrado de usuarios (en su empresa) |
| `Viewer` | Solo lectura en todas las secciones que tiene acceso |
| `is_super_admin` | **Global**: acceso virtual a TODAS las empresas sin membresía. Solo por SQL, sin UI |

Permisos por módulo: `auth`, `users`, `roles`, `company`, `settings`, `profile`, `dashboard`, `branches`, `audit`. Cada uno tiene `read`, `create`, `update`, `delete` según aplique.

Para agregar un permiso nuevo:
1. Agregar la constante en `src/common/constants/permissions.ts`
2. Espejarlo en `frontend/src/constants/permissions.ts`
3. Agregar el `INSERT` en `src/migrations/004-seed-permissions-roles.sql` (nueva migración si ya está aplicada)
4. Usar `@RequirePermissions(Permissions.MODULE.ACTION)` en el controlador

### Super-administrador global

- Columna `users.is_super_admin` (migración `017`). **No existe ningún endpoint que la escriba**: solo se otorga/revoca por SQL directo. Así es imposible la escalada de privilegios desde la app.
- Otorgar: `UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@ejemplo.com';`
- Revocar: `UPDATE users SET is_super_admin = FALSE WHERE email = '...';` + `DELETE FROM refresh_tokens WHERE user_id = '...';` (fuerza re-login; el access token vigente expira en ≤15 min).
- Endpoints exclusivos: `GET /api/companies/all` (guard `SuperAdminGuard`).
- Endpoints con empresa explícita (`POST/DELETE /api/companies/:id/members`): el super-admin opera sobre cualquier `:id`; el resto debe enviar `x-company-id` igual al `:id`.
- Auditoría: sus acciones quedan registradas como cualquier miembro (con la empresa destino explícita).

### Seguridad implementada

- **Logout real**: los access tokens se añaden a la blacklist al cerrar sesión o cambiar contraseña.
- **No roles globales**: `POST /roles` requiere `x-company-id`; sin él el servidor rechaza con 400.
- **Anti-IDOR en roles**: `PUT/DELETE /roles/:id` verifica que el rol pertenezca a la empresa del llamador.
- **Password history**: compara la candidata en claro contra los últimos 3 hashes (bcrypt.compare correcto).
- **Política de contraseña unificada**: 8+ caracteres, al menos una mayúscula, minúscula y número — en registro, cambio y reseteo.
- **Temporales con `crypto.randomBytes`**: seguro criptográficamente; las contraseñas temporales se envían por correo, nunca en el JSON de respuesta.
- **Verificación con expiración**: los enlaces de cambio de email expiran en 24h (`email_verification_expires_at`).
- **Último Owner protegido**: no se puede eliminar el único Owner de una empresa.

## Emails transaccionales

`EmailService.send()` elige transporte en este orden:

1. **Brevo HTTP API** (`BREVO_API_KEY`) — puerto 443, no filtrado por hostings. Reintenta 1× en 5xx/red.
2. **SMTP clásico** (`SMTP_HOST/PORT/SECURE/USER/PASS`) — puede estar filtrado en Render; usar Brevo API mejor.
3. **Stub** — sin configuración: loguea en dev; lanza `InternalServerErrorException` en producción (no finge éxito silencioso).

Reglas:
- `EMAIL_FROM` acepta `"Nombre <email@dominio>"` o email plano. El remitente debe estar verificado en el proveedor.
- Jamás se loguean tokens ni contraseñas (solo destino y asunto).
- Al arrancar, el servicio registra su modo (`brevo-api`, `smtp` o `stub`) en los logs.
- Para un correo nuevo: agregar template en `src/email/templates.ts` + método `send*` en `EmailService`.

Correos activos: **recuperación de contraseña** (link JWT 15min), **verificación de email** (token 24h), **contraseña temporal** (al invitar o resetear).

## Observabilidad

### Logs estructurados (pino)
- Cada request recibe un `x-request-id` UUID (o propaga el del cliente).
- Los logs salen en **JSON** con: `type`, `requestId`, `method`, `url`, `ip`, `statusCode`, `durationMs`.
- Los endpoints sensibles (`/auth/login`, `/auth/register`) no loguean el body.
- Ver en tiempo real: Render → Logs. Buscar por `requestId` para seguir una petición de punta a punta.
- Para pretty-print en local: `npm run dev | npx pino-pretty`.

### Sentry (opt-in)
- Solo se activa con `SENTRY_DSN` en las variables de entorno.
- Captura únicamente errores 5xx (los 4xx son comportamiento esperado).
- Cada evento incluye: `request-id` (para correlacionar con logs de Render), `userId`, método, URL y body sanitizado.
- Para crear un proyecto: sentry.io → New Project → **NestJS** → copiar DSN.

### Health check
- `GET /health` — público, usado por Render y UptimeRobot.
- Responde `200 {"status":"ok","database":"up","uptimeSeconds":...}` si la BD contesta en 5s.
- Responde `503` si la BD no contesta (Render detiene el deploy; UptimeRobot alerta).

## Documentación API

Con `SWAGGER_ENABLED=true` + credenciales: `http://localhost:3000/api/docs` (JSON en `/api/docs-json`). En producción apagado por defecto. Si se necesita temporalmente en prod: encender, consultar, apagar.

## Despliegue en Render

Configuración del servicio Web Service:
- **Root**: `backend`
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run start:prod`
- **Health check path**: `/health`
- **Variable extra obligatoria**: `NPM_CONFIG_PRODUCTION=false` (sin esto, `@nestjs/cli` no está disponible y el build muere con `nest: not found`)

Variables mínimas en el dashboard (ver `.env.example` para lista completa):
`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `NODE_ENV=production`, `SWAGGER_ENABLED=false`.

## Problemas comunes

| Síntoma | Causa típica | Solución |
|---|---|---|
| El servidor no arranca: `Faltan variables...` | `DATABASE_URL`, `JWT_SECRET` o `CORS_ORIGIN` no configuradas | Revisar dashboard de Render o el `.env` local |
| `400` en `GET /companies/users` | Conflicto de rutas (ver comentario en `company.controller.ts`) | Usar la ruta exacta `/api/companies/users` |
| `401` tras cambio de empresa | Tokens viejos en el cliente | Re-login o cambiar de empresa desde la UI |
| `403` inesperado | Claims del JWT desactualizados o permiso insuficiente | Cambiar de empresa (refresca claims) o contactar al Owner |
| Deploy queda en "Waiting for health check" | BD no responde en 5s (Supabase pausado o incidente) | Restaurar proyecto en Supabase → Manual Deploy en Render |
| `nest: not found` en el build de Render | `NPM_CONFIG_PRODUCTION=true` (default de Render) | Agregar `NPM_CONFIG_PRODUCTION=false` en las env vars |
| Email nunca llega | Remitente no verificado en Brevo o falta `BREVO_API_KEY` | Ver los logs del arranque (`[EmailService] Modo de envío: ...`) |
| Conexión a BD cae en nube | Usando pooler incorrecto (`:5432` en vez de `:6543`) | Cambiar `DATABASE_URL` al pooler `:6543` |
