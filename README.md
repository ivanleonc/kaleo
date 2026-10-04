# Kaleo — Plataforma multi-tenant

SaaS de gestión organizacional: empresas, sedes, miembros, roles y permisos, con **auditoría total** de acciones (quién, qué, antes/después) y autenticación JWT con cambio forzado de temporales.

## Documentación

📖 **[Ver documentación completa →](./docs/)** (VitePress)

```bash
# Ver la documentación en local
npm run docs:dev
# → http://localhost:5173
```

La documentación cubre:
- **Desarrolladores**: arquitectura, composables, componentes UI, API REST, guías para crear módulos
- **Integradores**: referencia completa de la API REST con ejemplos
- **Usuarios**: manual de uso de la plataforma

```
┌──────────────┐      HTTPS      ┌──────────────┐     SQL      ┌────────────────┐
│   frontend   │ ──────────────▶ │   backend    │ ───────────▶ │ Supabase       │
│ Vue 3 + Vite │  Bearer +       │ NestJS +     │  pooler      │ Postgres       │
│ (Cloudflare  │  x-company-id   │ TypeORM      │  :6543       │ (3 proyectos)  │
│  Pages)      │                 │ (Render)     │              │                │
└──────────────┘                 └──────────────┘              └────────────────┘
```

## Ambientes

| Ambiente | Frontend | Backend | Base de datos | Uso |
|---|---|---|---|---|
| **Local dev** | localhost:5173 | localhost:3000 | `kaleo-dev` | `npm run dev` — desarrollo diario |
| **Local prod** | localhost:5173 | localhost:3000 | `kaleo-prod` (datos reales) | `npm run dev:prod` — depurar producción |
| **Staging** | Pages staging | Render Free + UptimeRobot | `kaleo-prod` | Validar antes de prod |
| **Prod** | Pages prod + dominio | Render + dominio | `kaleo-prod` | Clientes reales |

Regla: **local → dev** para romper sin miedo; **staging** para validar; **prod** solo con CI verde + humo verde en staging.

## Arranque en local (una sola terminal)

Desde la raíz del proyecto:

```powershell
# Primera vez: instala dependencias de backend + frontend
npm run install:all

# Desarrollo diario (BD kaleo-dev: rompe sin miedo)
npm run dev

# Depurar con datos reales (BD kaleo-prod = producción actual)
npm run dev:prod
```

Ambos comandos levantan **backend (:3000) + frontend (:5173)** en paralelo en la misma terminal, con logs etiquetados `[backend]` y `[frontend]`.

| Comando | Backend | Frontend | Base de datos | Cuándo usarlo |
|---|---|---|---|---|
| `npm run dev` | localhost:3000 (`.env.development`) | localhost:5173 | `kaleo-dev` | Desarrollo diario, experimentar, romper cosas |
| `npm run dev:prod` | localhost:3000 (`.env.production`) | localhost:5173 | `kaleo-prod` (datos reales) | Depurar errores de producción, probar con datos de verdad |

> ⚠️ `dev:prod` trabaja contra **datos reales**: lo que crees, edites o borres afecta producción. Para experimentar usa `dev`.
>
> ⚠️ En local los **correos no se envían** (modo stub: solo se loguean). Si invitas un miembro o reseteas una clave en local, busca la contraseña temporal en el log del backend.

Flujo inicial: registro → onboarding (crear empresa) → dashboard. Detalles en `backend/README.md` y `frontend/README.md`.

## Flujo de trabajo diario

1. Trabaja en ramas `feat/*`; push a `main` = auto-deploy a staging y activa el CI.
2. **Antes de cada push**: CI corre typecheck + lint + tests + build automáticamente. El push pasa si todo está verde.
3. **Migraciones**: ver sección "Migraciones" abajo. Orden: development → production.
4. **Secretos**: cada ambiente con su `JWT_SECRET` distinto. Rotarlo cierra todas las sesiones activas — avisar a los usuarios. Nada sensible en git.

## Migraciones de base de datos

Los archivos viven en `backend/src/migrations/`. Se aplican **a mano** en el SQL editor de Supabase, en orden numérico estricto.

### Migraciones disponibles

| Archivo | Qué hace |
|---|---|
| `000-baseline-schema.sql` | Esquema completo inicial (re-ejecutable) |
| `002-add-auth-improvements.sql` | Mejoras de autenticación |
| `003-add-rbac-permissions.sql` | Tabla de permisos RBAC |
| `004-seed-permissions-roles.sql` | Seed: Owner/Admin/Viewer + 28 permisos del sistema |
| `005-expand-audit-action-column.sql` | Amplía columna `action` en auditoría |
| `006-create-branches-table.sql` | Tabla de sedes |
| `007-add-permission-name.sql` | Nombre legible en permisos |
| `008-add-audit-response-columns.sql` | Columnas de respuesta en auditoría |
| `009-add-audit-indexes.sql` | Índices de rendimiento en auditoría |
| `010-cleanup-audit-response-bloat.sql` | Limpia columnas obsoletas de auditoría |
| `011-extended-profile-fields.sql` | Campos extendidos de perfil de usuario |
| `012-add-missing-indexes.sql` | Índices faltantes en varias tablas |
| `013-add-audit-keyset-index.sql` | Índice keyset para paginación de auditoría |
| `014-backfill-company-slugs.sql` | Rellena slugs de empresas existentes |
| `015-add-email-verification-expiry.sql` | Expiración de enlaces de verificación (24h) |
| `016-cleanup-orphan-user-contexts.sql` | Limpia contextos huérfanos de roles borrados |
| `017-add-super-admin-flag.sql` | Flag `users.is_super_admin` (super-admin global) |

### Reglas de oro

- **Nunca editar** una migración ya aplicada — crear un archivo nuevo numerado.
- **`000` es la base**: re-ejecutable sin errores, representa el esquema completo.
- **Tablas particionadas** (`audit_logs_*`): los `ALTER TABLE` van siempre a la tabla padre.
- **Verificar antes de aplicar a prod**:
  ```sql
  SELECT version FROM schema_migrations ORDER BY version;
  ```

## Checklist de deploy a producción

### Pre-deploy
- [ ] CI verde en GitHub Actions (typecheck + lint + tests + build).
- [ ] Migraciones pendientes aplicadas en Supabase prod (ver tabla arriba).
- [ ] Variables de entorno en Render configuradas (ver `backend/.env.example`):
  - `DATABASE_URL` — pooler Supabase `:6543`
  - `JWT_SECRET` — único para prod, **distinto** al de development
  - `CORS_ORIGIN` — URL exacta de la web (ej: `https://app.tuempresa.com`)
  - `FRONTEND_URL` — igual que `CORS_ORIGIN`
  - `NODE_ENV=production`
  - `SWAGGER_ENABLED=false`
  - `BREVO_API_KEY` + `EMAIL_FROM` — remitente verificado en Brevo
  - `NPM_CONFIG_PRODUCTION=false`
  - _(opcional)_ `SENTRY_DSN` — DSN del proyecto NestJS en sentry.io
  - _(opcional)_ `APP_VERSION` — versión para agrupar eventos de Sentry
- [ ] Health path en Render → `/health`.
- [ ] `VITE_API_URL` configurada en Cloudflare Pages + rebuild disparado.
  - _(opcional)_ `VITE_SENTRY_DSN` — DSN del proyecto Vue en sentry.io
  - _(opcional)_ `VITE_APP_VERSION` — versión para agrupar eventos de Sentry
- [ ] Supabase: copias de seguridad (PITR) activadas en el proyecto de prod.

### Primera vez con un cliente (solo una vez)
```powershell
cd backend
npm run seed:owner -- prod admin@miempresa.com "Nombre Admin" "Mi Empresa SAS"
```
- El script imprime la contraseña temporal. Envíala al cliente por canal seguro (nunca sin TLS).
- El sistema fuerza el cambio en el primer login.

### Post-deploy (validación)
- [ ] `GET https://tu-api.onrender.com/health` → `{"status":"ok","database":"up"}`.
- [ ] Login en la web → recorrer Panel → Miembros → Sedes → Roles → Auditoría → Ajustes.
- [ ] `GET https://tu-api.onrender.com/api/docs` → debe dar 404 (Swagger apagado en prod).
- [ ] UptimeRobot apuntando a `https://tu-api.onrender.com/health`.

## Observabilidad

### Sentry
- **Frontend**: activar con `VITE_SENTRY_DSN` en Cloudflare Pages. Tipo de proyecto: **Vue**.
- **Backend**: activar con `SENTRY_DSN` en Render. Tipo de proyecto: **NestJS**.
- Solo reporta errores 5xx (los 4xx son comportamiento esperado y no saturan el dashboard).
- Los errores incluyen: `request-id`, URL, método, userId, body sanitizado (sin contraseñas/tokens).
- Sin DSN configurado el código funciona igual, sin overhead.

### Logs estructurados (backend)
- Cada request recibe un `x-request-id` UUID que se propaga en la respuesta.
- Los logs salen en JSON estructurado (pino) con `type`, `requestId`, `method`, `url`, `statusCode`, `durationMs`.
- Ver en tiempo real: Render → Logs. Para buscar una petición: filtrar por `requestId`.
- Para correlacionar con Sentry: el `request-id` aparece como tag en cada evento.
- Para pretty-print en local: `npm run dev | npx pino-pretty`.

### Offline banner (frontend)
- Aparece automáticamente cuando el navegador pierde conexión.
- Desaparece en cuanto se recupera. No bloquea la UI — es informativo.

## Costos (~$0 mientras se desarrolla)

Render Free (750h/mes ≈ 1 servicio 24/7 tibio vía UptimeRobot) + Cloudflare Pages + Supabase free (2 proyectos activos, pausar el tercero si se necesita). Al escalar: Render Starter (~$7/mes) o Railway Hobby ($5/mes), mismo código sin cambios.

## Decisiones de diseño

- **Empresa activa triple**: `ref` Pinia + `localStorage` + parámetro URL — cada capa cubre el fallo de la otra (memoria, recarga, links directos).
- **JWT con claims por empresa**: rápido sin leer BD, se congela al emitir → se refresca en cada `refresh`, cambio de empresa y creación de empresa. Ventana residual: 15 min.
- **Auditoría particionada** (`audit_logs_*` + `default`): retiene 365 días, limpieza diaria. El interceptor excluye `/audit` y `/health` para no auto-loguearse.
- **Soft-delete**: borrar es lógico (`deleted_at`); `ON DELETE CASCADE` solo actúa en borrados físicos a nivel de BD.
- **RBAC por nombres, no IDs**: `Owner/Admin/Viewer` + permisos `modulo:accion`. El frontend refleja con `v-permission` pero el backend **siempre revalida**.
- **Transacciones atómicas**: cambios de contraseña, registro y operaciones multi-tabla usan `QueryRunner` para garantizar consistencia.
- **Email post-commit**: el correo se envía después de commitear a BD. Si falla, el usuario recibe 500 (no hay estado inconsistente silencioso).
- **Invitaciones por correo**: la contraseña temporal nunca aparece en el JSON de respuesta — siempre se envía al email del invitado.
- **Onboarding explícito**: el registro no crea empresa → ruta `/onboarding`. Un usuario puede pertenecer a varias empresas.

## Mapa del código

```
backend/src/
├── auth/          → Login, registro, sesión, passwords (transacciones), guards, JWT strategy
├── members/       → Miembros del equipo (altas por email, roles, estados, reseteo)
├── company/       → Empresas, tenancy, verificación de pertenencia
├── branches/      → Sedes (paginadas, filtradas, soft-delete)
├── rbac/          → Roles y permisos (scoped por empresa, guards, IDOR protegido)
├── audit/         → Interceptor global, repositorio particionado, retención 365d, CSV
├── email/         → Envíos transaccionales (Brevo API → SMTP → stub)
├── common/        → Guards, decoradores, filtros (Sentry), middleware (request-id+logs), constantes RBAC
└── migrations/    → SQL versionado (000 a 016)

frontend/src/
├── api/           → axios client (auth, x-company-id, refresh auto en 401, mensajes en español)
├── assets/        → Sistema de diseño CSS (variables, breakpoints, componentes base)
├── components/ui/ → 28 componentes reutilizables del kit
├── composables/   → useToast, useTheme, useCompanyPath, useAsyncOperation, useAppTable,
│                    useFilterSync, useDirtyForm, useDebounceFn, useOnlineStatus, useClipboard
├── layouts/       → AuthenticatedLayout (topbar, sidebar, org-switcher, paleta Ctrl+K, offline banner)
├── lib/           → sentry.ts (inicialización opt-in)
├── router/        → Rutas /companies/:companyId/* + guards (auth, tenant, password, permiso)
├── stores/        → auth (sesión+tenant), member, branch, company, audit (con reset por empresa)
├── services/      → Llamadas API por dominio
├── types/         → Tipos por dominio
└── views/         → 15 vistas
```
