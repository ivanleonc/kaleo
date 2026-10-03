# Frontend — App SaaS (Vue 3 + TypeScript)

SPA con **Vue 3 + Composition API**, **Vite 8**, **Pinia** (persistido en `localStorage`), **Vue Router 5** en modo history y **ECharts** para gráficas. Sin framework CSS externo: sistema propio con variables en `src/assets/main.css`.

## Requisitos

- Node.js `>=22 <25` (ver `engines`), npm 10+
- Backend corriendo (local `:3000`) con su BD correspondiente (`kaleo-dev` o `kaleo-prod`)

## Instalación y arranque

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## Variables de entorno

Vite **hornea** las variables en el build: cambiar cualquier `VITE_*` exige rebuild/redeploy.

| Archivo | Cuándo aplica |
|---|---|
| `.env.example` | Plantilla. Cópiala a `.env.development` para empezar |
| `.env.development` | Desarrollo local |
| Dashboard de Cloudflare | Staging y producción |

Variables disponibles:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `VITE_API_URL` | ✅ en prod | URL base del backend con `/api` al final. Sin esto el build de prod falla explícitamente |
| `VITE_SENTRY_DSN` | — | DSN del proyecto Vue en sentry.io. Sin esto Sentry queda desactivado (opt-in) |
| `VITE_APP_VERSION` | — | Versión para agrupar eventos de Sentry por release |

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo con hot-reload (`http://localhost:5173`, habla con el backend de `VITE_API_URL`) |
| `npm run build` | `type-check` + build a `dist/` (lo corre Cloudflare) |
| `npm run build-only` | Solo Vite sin type-check (más rápido para iterar) |
| `npm run type-check` | `vue-tsc` — **correr antes de cada push** |
| `npm run test:run` | Vitest una vez (CI) — 134 tests |
| `npm run test:unit` | Vitest en modo watch (desarrollo) |

> Tip: desde la raíz del proyecto levanta backend + frontend juntos con `npm run dev` (BD `kaleo-dev`) o `npm run dev:prod` (BD `kaleo-prod` con datos reales). Ver README raíz.
| `npm run format` | Prettier sobre `src/` |

## Estructura del código

```
src/
├── api/
│   └── axios.ts          → Cliente HTTP: inyecta Bearer + x-company-id,
│                            refresh automático en 401, mensajes en español para 403/offline
│
├── assets/main.css        → Sistema de diseño completo (variables, badges, tablas,
│                            skeletons, filtros, breakpoints, prefers-reduced-motion)
│
├── components/
│   ├── ui/               → 28 componentes reutilizables (ver lista abajo)
│   ├── CommandPalette.vue → Paleta de comandos (Ctrl+K), combobox a11y completo
│   └── DashboardMetricCard.vue
│
├── composables/
│   ├── useAppTable.ts     → Wrapper TanStack Table v9: server sort/pagination, AppColumnDef
│   ├── useAsyncOperation.ts → Estado loading/error para operaciones async
│   ├── useClipboard.ts    → Copiar al portapapeles con toast
│   ├── useCompanyPath.ts  → companyId activo + helpers de URL por empresa
│   ├── useDebounceFn.ts   → Debounce seguro fuera de setup
│   ├── useDirtyForm.ts    → Detecta cambios no guardados en formularios
│   ├── useFilterSync.ts   → Sincroniza filtros declarativos con el store (watch + debounce)
│   ├── useOnlineStatus.ts → Detecta conexión/desconexión (eventos online/offline)
│   ├── useTheme.ts        → Tema claro/oscuro
│   └── useToast.ts        → Sistema de toasts
│
├── directives/
│   └── permission.ts      → v-permission="'users:read'" — elimina el elemento si sin permiso
│
├── layouts/
│   ├── AuthenticatedLayout.vue → Topbar, sidebar, org-switcher, UiOfflineBanner
│   └── AuthLayout.vue          → Layout para login/register/forgot
│
├── lib/
│   └── sentry.ts          → initSentry(app, router) — opt-in, sin DSN no hace nada
│
├── router/index.ts        → Rutas + guards (auth, tenant, password forzado, permiso)
│
├── stores/
│   ├── auth.store.ts      → Sesión, usuario, tenant activo (persiste en localStorage)
│   ├── member.store.ts    → Paginación server-side, reset automático al cambiar empresa
│   ├── branch.store.ts    → Idem para sedes
│   ├── audit.store.ts     → Cursor-pagination, reset automático al cambiar empresa
│   └── company.store.ts   → Detalle y edición de empresa
│
├── services/              → Llamadas API por dominio (member, branch, role, audit, user, company)
├── types/                 → Tipos por dominio (auth, member, branch, role, company, audit, ui)
│
├── utils/
│   ├── error.ts           → apiErrorMessage, hasApiError (mensajes en español)
│   ├── token.service.ts   → Acceso a tokens en localStorage
│   └── tenant.ts          → resolveTenantByParam, preservableSection, companyPathFor…
│
└── views/ (15 vistas)
    ├── LoginView, RegisterView, ForgotPasswordView, ResetPasswordView
    ├── OnboardingView      → Crear primera empresa
    ├── VerifyEmailView     → Confirmar cambio de correo
    ├── DashboardView       → Panel con métricas y accesos rápidos
    ├── MembersView         → Equipo con tabla TanStack, filtros, invitar por email
    ├── BranchesView        → Sedes con tabla TanStack, filtros, is_main
    ├── RolesView           → Roles personalizados y permisos
    ├── AuditView           → Auditoría con cursor-pagination y export CSV
    ├── SettingsView        → Configuración de empresa (slug, logo, fiscal…)
    ├── ProfileView         → Perfil personal, cambio de email con verificación
    ├── ChangePasswordView  → Cambio de contraseña (normal y forzado post-temporal)
    └── NotFoundView        → 404
```

## Kit de componentes UI

Todos en `src/components/ui/`. Importar con `@/components/ui/NombreComponente.vue`.

| Componente | Para qué |
|---|---|
| `UiAlert` | Mensajes de error/info/warning/success en contexto |
| `UiAvatar` | Avatar con iniciales de fallback |
| `UiBadge` | Etiqueta de estado/tipo |
| `UiButton` | Botón con variantes, loading, width |
| `UiCard` | Contenedor con slots header/footer |
| `UiChart` | Gráfica ECharts responsiva |
| `UiConfirmDialog` | Diálogo de confirmación de acción irreversible |
| `UiCursorPagination` | Paginación por cursor (siguiente/anterior) |
| `UiDataTable` | Tabla server-side: sort, skeleton, error, empty, mobile-cards |
| `UiDropdown` + `UiDropdownItem` | Menú contextual accesible (teclado, foco, Escape) |
| `UiDualListbox` | Asignar/desasignar listas (ej: roles a miembro) |
| `UiEmptyState` | Estado vacío con icono, título, descripción y acción |
| `UiErrorState` | Estado de error con retry |
| `UiExportButton` | Botón de descarga CSV con loading |
| `UiFieldError` | Error inline debajo de un campo |
| `UiFormModal` | Modal de formulario con confirm-on-dirty |
| `UiInput` | Input con label, error, tipo password con toggle |
| `UiModal` | Modal base: foco, trap, Escape, scroll-lock, animación |
| `UiOfflineBanner` | Banner de sin conexión (slide desde abajo) |
| `UiPageHeader` | Título + subtítulo + slot de acciones |
| `UiPagination` | Paginación offset (página, límite, totales) |
| `UiPasswordStrength` | Indicador visual de fortaleza de contraseña |
| `UiSearchInput` | Input de búsqueda con icono y clear |
| `UiSelect` | Select con label y aria-label |
| `UiSkeleton` | Placeholder de carga animado |
| `UiTableFilters` | Barra de filtros declarativa + v-model + slot escape |
| `UiToast` | Toasts (éxito, error, info, warning, con acción deshacer) |

### Patrones estándar para una vista nueva

```vue
<template>
  <AuthenticatedLayout>
    <!-- 1. Cabecera -->
    <UiPageHeader title="Mi Sección" subtitle="Descripción breve">
      <template #actions>
        <UiButton v-permission="Permissions.MODULE.CREATE" @click="openAddModal">
          <IconPlus :size="16" /> Nuevo
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- 2. Filtros (declarativos) -->
    <UiTableFilters v-model="filterValues" :filters="filterDefs" />

    <!-- 3. Tabla con TanStack (server-side) -->
    <UiDataTable
      :table="myTable"
      :loading="isInitialLoading"
      :error="store.error"
      @retry="store.fetch()"
    >
      <template #cell-actions="{ row }">
        <!-- acciones por fila -->
      </template>
    </UiDataTable>

    <!-- 4. Paginación -->
    <UiPagination
      :page="store.page"
      :total="store.total"
      :limit="store.limit"
      @update:page="store.goToPage"
      @update:limit="store.setLimit"
    />
  </AuthenticatedLayout>
</template>
```

Para las tablas con TanStack ver `src/composables/useAppTable.ts`: `createAppColumnHelper`, `useAppTable`, `useControlledSorting`, `sortingStateToServer`.

## Sistema de filtros (`UiTableFilters` + `useFilterSync`)

```ts
// 1. Valores reactivos
const filters = ref({ search: '', status: '' });

// 2. Definición declarativa
const filterDefs: TableFilterDef[] = [
  { key: 'search', type: 'search', label: 'Buscar', placeholder: 'Nombre...', grow: true },
  { key: 'status', type: 'select', label: 'Estado', options: [
    { label: 'Todos', value: '' },
    { label: 'Activo', value: 'active' },
  ]},
];

// 3. Sincronización automática con el store (debounce 350ms)
useFilterSync(filters, (v) => store.applyFilters({ search: v.search, status: v.status || undefined }));
```

Para filtros especiales (ej: rango de fechas) usar el slot `#filter-{key}` con `{ values, update }`.

## Permisos en la UI

```vue
<!-- Ocultar elemento si el usuario no tiene el permiso -->
<UiButton v-permission="Permissions.USERS.CREATE">Invitar</UiButton>

<!-- Ruta protegida (si intenta acceder sin permiso, va al Panel) -->
// router/index.ts:
meta: { requiredPermission: Permissions.BRANCHES.READ }
```

Importar siempre desde `@/constants/permissions`. El backend **siempre revalida**: el frontend es solo UX.

## Gestión de errores estándar

```ts
// En un store (patrón recomendado):
const { isLoading, error, execute: withLoading } = useAsyncOperation();
await withLoading(() => apiCall(), 'Error al cargar');

// El error se muestra en la vista:
<UiErrorState v-if="store.error" :description="store.error" @retry="store.fetch()" />

// Mensajes HTTP ya traducidos al español:
// 403 → "No tienes permiso para realizar esta acción."
// Network Error → "Sin conexión al servidor."
// Otros → mensaje del servidor o fallback en español
```

## Auth y tenancy

- **Empresa activa**: `authStore.activeTenantId` + `localStorage` + URL. Los tres se sincronizan en el router guard.
- **Cambiar de empresa**: permanece en la misma sección (Members, Branches, etc.) y refresca los tokens. Si la nueva empresa no tiene permiso para esa sección, el guard redirige al Panel.
- **Stores por empresa**: `memberStore`, `branchStore` y `auditStore` detectan el cambio de empresa y limpian su estado automáticamente antes del siguiente fetch.
- **JWT claims**: se congelan al emitir. Se refrescan en `refresh`, en cada cambio de empresa y al crear empresa.
- **must_change_password**: el guard redirige a `/change-password` en cada navegación hasta que el usuario cambie la contraseña temporal.

### Multi-empresa y super-admin

- **Asignar empresas a un miembro** (Owner/Admin o super-admin): modal *Invitar Miembro* con buscador de usuarios existentes + selector multi-empresa (mismo rol por nombre en todas), o modal *Gestionar empresas* desde la fila del miembro (detalle por empresa con agregar/quitar).
- **Header por request**: `memberService.attachToCompany` / `roleService.getRoles(companyId)` envían `x-company-id` explícito sin mutar el tenant activo (el interceptor de axios respeta un header ya presente).
- **Super-admin** (`authStore.isSuperAdmin`): pasa todos los `hasPermission`/`hasRole`; el switcher muestra la sección *Todas las empresas* (`companyStore.allCompanies`, precargadas al montar el layout); el router y `useCompanyPath` resuelven slugs/UUIDs también contra esa lista.
- **Roles por nombre**: al asignar a varias empresas se envían `roleNames` (se resuelven por empresa en el backend); en una sola empresa se usan `roleIds` como siempre.

## Observabilidad

### Sentry (opt-in)
- Se activa con `VITE_SENTRY_DSN` en Cloudflare Pages.
- Sin DSN: el bundle no incluye ningún overhead extra.
- Para crear el proyecto: sentry.io → New Project → **Vue** → copiar DSN.
- Los errores incluyen las rutas navegadas y las breadcrumbs de Pinia.
- Session Replay se activa solo en errores (no hay grabación continua de sesiones).

### Offline banner
- Aparece automáticamente cuando `navigator.onLine` es `false`.
- Usa el composable `useOnlineStatus` para escuchar eventos `online`/`offline`.
- No bloquea la UI: es solo informativo.

## Sistema responsive

**Breakpoints**: `640px` (móvil) y `768px` (tablet). No inventar otros en vistas.

**Touch first** con `(pointer: coarse)`:
- Todo lo interactivo: mínimo **44px** (botones, dropdowns, paginación).
- Inputs: **16px** de fuente en táctil (iOS hace zoom con menos de 16px).
- Las tablas se convierten en tarjetas en móvil via `data-label` (ya manejado por `UiDataTable`).

**Dónde vive cada regla**:
- Lo genérico: `src/assets/main.css` sección `RESPONSIVE SYSTEM`.
- Lo propio de un componente: `<style scoped>` del componente.
- Las vistas **no** definen reglas táctiles — usan el kit.

**Checklist para una vista nueva**: 1) probar a 360px sin scroll horizontal (salvo tablas), 2) tocar cada botón con el pulgar (≥44px), 3) enfocar cada input (sin zoom en iPhone), 4) girar a horizontal.

## Despliegue en Cloudflare Pages

- **Root**: `frontend`
- **Framework**: Vite
- **Build command**: `npm run build`
- **Output**: `dist`
- **Variable obligatoria**: `VITE_API_URL=https://tu-api.onrender.com/api`

El fallback SPA lo maneja Pages nativo. No se necesita `_redirects`. Cada push a `main` redespliega.

## Problemas comunes

| Síntoma | Causa típica | Solución |
|---|---|---|
| Login da 404 a `/auth/login` | `VITE_API_URL` sin `/api` al final | Corregir + rebuild |
| Build prod falla con "VITE_API_URL no configurada" | Falta la variable en Cloudflare | Agregarla y redesplegar |
| 401 en bucle tras deploy | Sesión vieja con JWT de otra versión | Cerrar sesión y volver a entrar |
| 403 al navegar | Claims del JWT desactualizados (roles por empresa) | Cambiar de empresa o re-login |
| La empresa vuelve a la anterior tras F5 | Bug de reconciliación de tenant | Abrir consola → buscar `[tenant]` → reportar la secuencia exacta |
| Página en blanco tras error | Error no capturado en la vista | Consola → Network (ver body de la respuesta del backend) |
| Sentry no recibe eventos | `VITE_SENTRY_DSN` no configurada o errores solo en dev | Verificar variable + rebuild; en dev los eventos se ignoran a propósito |
