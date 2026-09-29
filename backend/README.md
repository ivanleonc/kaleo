# Backend — API SaaS multi-tenant

API REST con **NestJS 12 + ESM** (`"type": "module"`), **TypeORM + PostgreSQL** (Supabase) y **JWT** con access (15 min) + refresh (7 días) por tokens.

## Requisitos

- Node.js `>=22 <25` (ver `engines`), npm 10+
- Base de datos PostgreSQL (Supabase). Una por ambiente: sandbox, staging, prod

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
| Producción/Render | Solo dashboard de Render | (no existe archivo) |

Carga en `src/main.ts`: primero `.env.[NODE_ENV]`, luego `.env` como respaldo; si no hay archivo, mandan las variables del host. Ver `.env.example` para la lista completa.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión Postgres (pooler Supabase `:6543` en nube) |
| `JWT_SECRET` | Firma de tokens. **Distinto por ambiente**; rotarlo cierra todas las sesiones |
| `CORS_ORIGIN` / `FRONTEND_URL` | Dominio exacto del frontend (CORS y enlaces de emails) |
| `PORT` | Lo inyecta el host; default `3000` en local |
| `SWAGGER_ENABLED` | `'true'` para exponer `/api/docs` (default: apagado) |
| `SWAGGER_USER` / `SWAGGER_PASSWORD` | Basic Auth de la documentación |

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` / `dev:sandbox` / `dev:staging` | Desarrollo con watch contra cada BD |
| `npm run build` | Compila a `dist/` (lo corre Render) |
| `npm run start:prod` | `node dist/main.js` (producción) |
| `npm run typecheck` | `tsc --noEmit` — **correr antes de cada push** |
| `npm test` | Vitest |

## Base de datos y migraciones

SQL plano en `src/migrations/`, se ejecutan **a mano en el SQL editor de Supabase** (no hay runner automático).

- Orden estricto: `000-baseline-schema.sql` → `002` → … → `011` (luego `012`, …).
- `000` es el esquema extraído de producción: re-ejecutable sin errores.
- **Reglas de oro**: nunca editar una migración ya aplicada; cada cambio = archivo nuevo numerado; probar siempre en sandbox → staging → prod.
- Seeds de roles/permisos del sistema viven en `003`/`004` (Owner/Admin/Viewer + 28 permisos).
- `audit_logs` es **particionada por rango** (`created_at`): `y2026h2`, `y2027` y `default`. Los `ALTER` siempre a la tabla **padre** (se propagan solas).

## Arquitectura (cómo está organizado)

```
src/
├── auth/          # Login, registro, sesión, passwords, guards, strategies
├── members/       # Miembros del equipo (altas, roles, estados, reseteo)
├── company/       # Empresas y tenancy
├── branches/      # Sedes
├── rbac/          # Roles, permisos y guards de permisos
├── audit/         # Interceptor global, repositorio particionado, retención, CSV
├── email/         # Envíos (verificación, reseteo, temporales)
├── common/        # Guards, decoradores, constantes RBAC
└── migrations/    # SQL versionado (ver arriba)
```

Conceptos clave:

- **Multi-tenancy**: cada request autenticada lleva header `x-company-id`. Todo filtra por empresa.
- **Guards globales** (`app.module.ts`): `ThrottlerGuard` (30 req/min) → `JwtAuthGuard` → `PasswordChangedGuard`. `@Public()` exime auth; `@SkipPasswordChanged()` exime cambio forzado.
- **RBAC**: fuente de verdad en `src/common/constants/` (`permissions.ts` formato `modulo:accion`, `roles.ts`). `Owner` todo (inmutable), `Admin` todo menos gestión de roles/borrado de usuarios, `Viewer` solo lectura.
- **Auditoría automática**: `AuditLogInterceptor` (global) registra toda mutación con antes/después (resolviendo IDs a nombres), respuesta, duración, IP y usuario. Lee `src/audit/` antes de tocarlo: hay reglas finas (endpoints `/audit` excluidos para no auto-loguearse, secretos redactados).
- **Sesiones**: los claims del JWT (roles/permisos/empresas) se congelan al emitir; se refrescan en cada `refresh`, cambio de empresa y creación de empresa. Revocar refresh tokens cierra sesiones ajenas (se usa al resetear/eliminar/desactivar).
- **Health check**: `GET /` es público a propósito (lo usa Render).

## Emails transaccionales (`src/email/`)

`EmailService.send()` elige transporte por variables presentes, en este orden:

1. **Brevo HTTP API** (`BREVO_API_KEY`): puerto 443, no lo filtran los hostings. Reintenta 1 vez ante errores de red o 5xx (no ante 4xx).
2. **SMTP clásico** (`SMTP_HOST/PORT/SECURE/USER/PASS`): puede estar filtrado según el host (Render bloquea el relay SMTP de Brevo).
3. **Stub**: sin configuración, solo loguea (dev) o avisa (prod). Nunca falla.

Reglas:
- `EMAIL_FROM` acepta `"Nombre <email@dominio>"` o email plano; el remitente debe estar verificado en el proveedor.
- Jamás se loguean tokens ni cuerpos con secretos (solo destino y asunto).
- Al arrancar, el servicio registra su modo (`brevo-api`, `smtp` o stub) — míralo en logs si un correo no llega.
- Plantillas en `src/email/templates.ts` (funciones puras, testeadas). Para un correo nuevo: agrega su template + método `send*` + test.
- Tests: `npx vitest run src/email/email.service.spec.ts`.

## Documentación API

Con `SWAGGER_ENABLED=true` + credenciales: `http://localhost:3000/api/docs` (JSON en `/api/docs-json`). En producción va apagado salvo necesidad.

## Despliegue (Render)

Servicio **Web Service**, root `backend`, build `npm install && npm run build`, start `npm run start:prod`, plan Free (duerme sin tráfico; UptimeRobot lo mantiene tibio), health path `/`, y variable extra obligatoria: `NPM_CONFIG_PRODUCTION=false` (si no, falta `@nestjs/cli` y el build muere con `nest: not found`).

## Problemas comunes

| Síntoma | Causa típica |
|---|---|
| `400` en `GET /companies/users` | Conflicto de rutas `:id` (ver comentario en `app.module.ts`) |
| `401` tras cambio de empresa | Tokens viejos: refrescar sesión / re-login |
| `403` inesperado | Claims del JWT desactualizados (roles por empresa) o falta permiso |
| Conexión a BD cae en nube | Usar pooler `:6543`; revisar `DATABASE_URL` del ambiente correcto |
| `JWT_SECRET required` al arrancar | Falta la variable (no hay default a propósito) |
