# Frontend — App SaaS (Vue 3 + TypeScript)

SPA con **Vue 3 + Composition API**, **Vite 8**, **Pinia** (persistido en `localStorage`), **Vue Router 5** en modo history y **ECharts** para futuras gráficas. Sin framework CSS: sistema propio con variables en `src/assets/main.css`.

## Requisitos

- Node.js `^20.19.0 || >=22.12.0`, npm 10+
- Backend corriendo (local `:3000` o staging) y su BD correspondiente

## Instalación y arranque

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## Variables de entorno

| Archivo | Cuándo aplica |
|---|---|
| `.env.development` | Desarrollo local (`VITE_API_URL=http://localhost:3000/api`) |
| Dashboard de Cloudflare | Staging/prod (`VITE_API_URL=https://<api>/api`) |

⚠️ Vite **hornea** las env en el build: cambiar `VITE_API_URL` exige rebuild/redeploy. Si el login da 404 a `/auth/...` sin `/api`, revisa esta variable primero.

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo con hot-reload |
| `npm run build` | `type-check` + build a `dist/` (lo corre Cloudflare) |
| `npm run build-only` | Solo Vite, sin type-check |
| `npm run type-check` | `vue-tsc` — **correr antes de cada push** |
| `npm run preview` | Previsualizar el build local |
| `npm run format` | Prettier |

## Estructura

```
src/
├── api/axios.ts        # Cliente HTTP: inyecta Bearer + x-company-id, refresh auto en 401
├── assets/main.css     # Sistema de diseño (variables, badges, tablas, skeletons, filtros…)
├── components/ui/      # Kit reutilizable: Button, Input(+error), Select, Modal,
│                       # Card, Alert, DualListbox, Dropdown(+Item), Toast, Table,
│                       # Pagination, PageHeader, EmptyState, SearchInput,
│                       # ExportButton, FieldError, Chart
├── components/         # CommandPalette, DashboardMetricCard
├── composables/        # useToast, useTheme, useCompanyPath, useAsyncOperation
├── layouts/            # AuthenticatedLayout (topbar, sidebar, org-switcher) y AuthLayout
├── router/             # Rutas /companies/:companyId/* + guards (auth, tenant, password, permiso)
├── stores/             # auth (sesión+tenant activo), member, branch, company, audit
├── services/           # Llamadas API por dominio
├── types/              # Tipos por dominio (auth, member, branch, role, company, audit)
├── utils/              # token.service, password (regla única de clave)
└── views/              # 13 vistas (Dashboard, Members, Branches, Roles, Audit…)
```

## Conceptos clave (cómo se trabaja aquí)

- **Empresa activa**: vive en `authStore.activeTenantId`, persiste en `localStorage` (`saas_active_tenant` + storage de Pinia) y se sincroniza con la URL (`/companies/:companyId/...`). Al cambiar de empresa se refrescan tokens (los claims son por empresa).
- **Auth flow**: login/register → onboarding si no hay empresas → dashboard. Flag `must_change_password` fuerza cambio; tras definir temporal se hace re-login (el JWT viejo queda stale).
- **Permisos en UI**: directiva `v-permission` + `meta.requiredPermission` en rutas. El backend siempre revalida.
- **Feedback estándar**: `toast.success/error` para éxitos; `UiAlert` inline para errores contextuales; `UiFieldError` + prop `error` en `UiInput` para errores por campo.
- **Listados estándar**: `UiPageHeader` + filtros (`UiSearchInput`) + `UiDataTable` (slots `cell-*`) + `UiPagination` + `UiEmptyState`. Para un reporte nuevo se componen estos + `UiExportButton`/`UiChart`.
- **Modales** (`UiModal`): Escape, foco inicial, focus-trap, y `:confirm-on-dirty` + `:dirty` para avisar cambios sin guardar.
- **Contraseñas**: regla única en `utils/password.ts` (6+mayús/min/núm). Cambiarla ahí, no por vista.
- **Fechas de auditoría**: respetan `authStore.user.timezone` si existe.

## Despliegue (Cloudflare Pages)

Proyecto Pages → repo → root `frontend`, framework Vite, build `npm run build`, output `dist`, env `VITE_API_URL` del ambiente. El fallback SPA ya lo maneja Pages nativo (no se necesita `_redirects`). Cada push a `main` redespliega.

## Problemas comunes

| Síntoma | Causa típica |
|---|---|
| Login 404 a `/auth/login` | `VITE_API_URL` sin `/api` al final (y rebuild tras cambiarla) |
| 401 en bucle tras deploy | Sesión vieja: cerrar sesión y entrar de nuevo |
| 403 al navegar | Claims desactualizados: cambiar de empresa o re-login |
| Empresa vuelve a la anterior tras F5 | Ver consola `[tenant]`; reportar secuencia exacta |
| Página en blanco tras error de API | Revisar consola + pestaña Network (response del backend) |
