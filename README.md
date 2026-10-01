# SaaS App — Plataforma multi-tenant

SaaS de gestión organizacional: empresas, sedes, miembros, roles y permisos, con **auditoría total** de acciones (quién, qué, antes/después) y autenticación JWT con cambio forzado de temporales.

```
┌──────────────┐      HTTPS      ┌──────────────┐     SQL      ┌────────────────┐
│   frontend   │ ──────────────▶ │   backend    │ ───────────▶ │ Supabase       │
│ Vue 3 + Vite │  Bearer +       │ NestJS +     │  pooler      │ Postgres       │
│ (Cloudflare  │  x-company-id   │ TypeORM      │  :6543       │ (3 proyectos)  │
│  Pages)      │                 │ (Render)     │              │                │
└──────────────┘                 └──────────────┘              └────────────────┘
```

## Ambientes (qué apunta a qué)

| Ambiente | Frontend | Backend | Base de datos | Uso |
|---|---|---|---|---|
| **Local** | `npm run dev` (:5173) | `dev` / `dev:sandbox` / `dev:staging` (:3000) | Sandbox (o la que indique el `.env`) | Desarrollo diario |
| **Staging** | Pages staging | Render Free + UptimeRobot | Proyecto `saas-staging` | Validar antes de prod |
| **Prod** (futuro) | Pages prod + dominio | Render + dominio | Proyecto prod actual | Usuarios reales |

Regla: **local→sandbox** para romper sin miedo; **staging** para validar; **prod** solo con humo verde en staging.

## Arranque rápido (desde cero)

```powershell
# 1. Backend (elige BD: dev, dev:sandbox o dev:staging)
cd backend
npm install
npm run dev:sandbox

# 2. Frontend (otra terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Luego en el navegador: registro → onboarding (crear empresa) → dashboard. Detalles por app en `backend/README.md` y `frontend/README.md`.

## Flujo de trabajo diario

1. Trabaja en ramas `feat/*`; `main` = staging (auto-deploy en ambos hosts).
2. **Antes de cada push**: `npm run typecheck` en backend y `npx vue-tsc --noEmit` en frontend, ambos en verde.
3. **Base de datos**: `backend/src/migrations/` se ejecuta **a mano** en el SQL editor, en orden `000 → 002 → … → 011 → 012…`, primero sandbox, luego staging, luego prod.
4. **Reglas de BD**: nunca editar una migración aplicada (nuevo archivo numerado); `ALTER` a tablas particionadas solo vía tabla padre; todos los archivos son re-ejecutables (verificado con doble corrida en Postgres real).
5. **Secretos**: cada ambiente con su `JWT_SECRET` (rotarlo cierra sesiones, hacerlo con BDs vacías o avisando). Nada sensible en git.

## Decisiones de diseño (por qué las cosas son así)

- **Empresa activa triple**: `ref` Pinia + llave `saas_active_tenant` + parámetro URL, reconciliados en el router guard. El tenant vive en 3 lugares porque cada uno cubre un fallo del otro (memoria, recarga, links directos).
- **JWT con claims por empresa** (roles/permisos/tenants): rápido sin leer BD, pero se congela al emitir → se refresca al cambiar de empresa, crearla, y en cada `refresh`. Ventana residual: 15 min (TTL del access).
- **Auditoría particionada por fecha** (`audit_logs_*` + `default`): retiene 365 días con limpieza diaria; el interceptor excluye `/audit` para no auto-loguearse y redacta secretos.
- **Soft-delete + `ON DELETE CASCADE`**: borrar es lógico (`deleted_at`); el cascade solo actúa en borrados físicos directos.
- **RBAC por nombres, no IDs**: `Owner/Admin/Viewer` + permisos `modulo:accion`; el frontend refleja con `v-permission` pero el backend siempre revalida.
- **Onboarding explícito**: el registro no crea empresa (un usuario puede no tener ninguna) → ruta `/onboarding`.
- **Swagger apagado por defecto**, con Basic Auth opt-in para devs.

## Checklist de deploy a producción (manual)

### Pre-deploy (una vez por ambiente)
- [ ] `npm run typecheck` + `npm run lint` + `npm test` + `npm run build` en verde (o esperar CI verde en GitHub Actions).
- [ ] Migraciones aplicadas en Supabase SQL editor **en orden** (`000 → 002 → … → 016`):
  ```
  015-add-email-verification-expiry.sql
  016-cleanup-orphan-user-contexts.sql
  ```
  Verificar con: `SELECT version FROM schema_migrations ORDER BY version;`
- [ ] Variables de entorno en Render configuradas:
  - `DATABASE_URL` — pooler Supabase `:6543`
  - `JWT_SECRET` — único para prod, distinto al de staging
  - `CORS_ORIGIN` — URL exacta de la web (sin `/`)
  - `FRONTEND_URL` — igual que `CORS_ORIGIN`
  - `NODE_ENV=production`
  - `SWAGGER_ENABLED=false`
  - `BREVO_API_KEY` + `EMAIL_FROM` — remitente verificado en Brevo
  - `NPM_CONFIG_PRODUCTION=false`
- [ ] `VITE_API_URL` configurada en Cloudflare Pages y rebuild disparado.
- [ ] Health path en Render → `/health` (no `/`).
- [ ] Supabase: copias de seguridad (PITR) activadas en el proyecto de prod.

### Primera vez con cliente
```powershell
# Crea el primer owner. Imprime la contraseña temporal.
cd backend
npm run seed:owner -- prod admin@miempresa.com "Nombre Admin" "Mi Empresa SAS"
```
- [ ] Enviar la contraseña temporal al cliente por canal seguro (nunca por email sin TLS).
- [ ] Pedirle que cambie la contraseña en el primer login (el sistema lo fuerza).

### Post-deploy
- [ ] Abrir `https://tu-api.onrender.com/health` → `"status":"ok","database":"up"`.
- [ ] Abrir la web, iniciar sesión, recorrer Panel → Miembros → Sedes → Roles → Auditoría → Ajustes.
- [ ] Verificar que `https://tu-api.onrender.com/api/docs` da 404 (Swagger apagado).
- [ ] UptimeRobot apuntando a `/health` (no a `/`).



Render Free (750h/mes ≈ 1 servicio 24/7 tibio vía UptimeRobot) + Cloudflare Pages + Supabase free (2 proyectos activos: pausar uno si se necesita el tercero). Al escalar: Render Starter (~$7) o Railway Hobby ($5), mismo código.

## Mapa rápido

- `backend/src/migrations/` — historial SQL versionado (+ `000-baseline-schema.sql` generado del dump).
- `backend/src/audit/` — interceptor, repositorio particionado, retención, export CSV.
- `backend/src/auth/` — sesión, passwords, guards, JWT.
- `frontend/src/components/ui/` — kit reutilizable (botones, inputs, modales, tabla, paginación, toasts, gráficas…).
- `frontend/src/views/` — 13 vistas; `layouts/` (topbar, sidebar, org-switcher, paleta `Ctrl+K`).
