# Router y Guards

## Tabla de rutas

| Ruta | Auth | Permiso requerido | Vista |
|---|---|---|---|
| `/` | — | — | Redirect → `/login` |
| `/login` | Guest only | — | `LoginView` |
| `/register` | Guest only | — | `RegisterView` |
| `/forgot-password` | Guest only | — | `ForgotPasswordView` |
| `/reset-password` | Guest only | — | `ResetPasswordView` |
| `/verify-email` | Público | — | `VerifyEmailView` |
| `/onboarding` | Auth | — | `OnboardingView` |
| `/companies/:companyId` | Auth | — | Redirect → dashboard |
| `/companies/:companyId/dashboard` | Auth | — | `DashboardView` |
| `/companies/:companyId/settings` | Auth | `company:read` | `SettingsView` |
| `/companies/:companyId/profile` | Auth | — | `ProfileView` |
| `/companies/:companyId/change-password` | Auth | — | `ChangePasswordView` |
| `/companies/:companyId/members` | Auth | `users:read` | `MembersView` |
| `/companies/:companyId/branches` | Auth | `branches:read` | `BranchesView` |
| `/companies/:companyId/roles` | Auth | `roles:read` | `RolesView` |
| `/companies/:companyId/audit` | Auth | `audit:read` | `AuditView` |
| `/:pathMatch(.*)*` | — | — | `NotFoundView` |

Todas las vistas usan **lazy imports**:
```ts
component: () => import('@/views/MembersView.vue')
```

## Campos `meta`

```ts
interface RouteMeta {
  requiresAuth?: boolean       // Redirige a /login si no está autenticado
  requiresGuest?: boolean      // Redirige al dashboard si ya está autenticado
  requiredPermission?: string  // Código de permiso: 'users:read', 'branches:create', etc.
  title: string                // Usado en document.title y afterEach
}
```

## Navigation guard — 7 escenarios

El guard `router.beforeEach` maneja estos escenarios en orden:

### 1. Restaurar tenant activo

```ts
authStore.healActiveTenant()
// Si activeTenantId es null, lo restaura desde localStorage
```

### 2. Super-admin en empresa desconocida

Si el usuario es super-admin y navega a una empresa que no está en su lista de tenants, carga `allCompanies` para resolverla:

```ts
if (authStore.isSuperAdmin && !knownTenant) {
  await companyStore.fetchAllCompanies()
}
```

### 3. Redirigir si no está autenticado

```ts
if (to.meta.requiresAuth && !authStore.isAuthenticated) {
  return { path: '/login', query: { redirect: to.fullPath } }
}
```

### 4. Canonicalización de slug

Si el `:companyId` en la URL es un UUID pero el tenant tiene slug, se redirige a la URL con slug:

```ts
if (tenant.slug && companyIdParam !== tenant.slug) {
  return { ...to, params: { ...to.params, companyId: tenant.slug }, replace: true }
}
```

### 5. Gate de onboarding

Si el usuario autenticado no tiene empresas (y no es super-admin), se redirige a `/onboarding`:

```ts
if (!authStore.user?.tenants?.length && !authStore.isSuperAdmin) {
  return { path: '/onboarding' }
}
```

### 6. Forzar cambio de contraseña

```ts
if (authStore.user?.must_change_password && to.path !== changePasswordPath) {
  return { path: companyPath('/change-password') }
}
```

### 7. Verificación de permiso

```ts
if (to.meta.requiredPermission && !authStore.hasPermission(to.meta.requiredPermission)) {
  return { path: companyPath('/dashboard') }
}
```

## `afterEach` — document.title

```ts
router.afterEach((to) => {
  const section = to.meta.title || ''
  const company = authStore.currentTenant?.name || ''
  document.title = [section, company, 'Kaleo'].filter(Boolean).join(' · ')
  // → "Miembros del Equipo · Empresa X · Kaleo"
})
```

## Agregar una nueva ruta

```ts
// En frontend/src/router/index.ts
{
  path: '/companies/:companyId/invoices',
  component: () => import('@/views/InvoicesView.vue'),
  meta: {
    requiresAuth: true,
    requiredPermission: Permissions.INVOICES.READ,
    title: 'Facturas',
  },
},
```

## `useCompanyPath` composable

```ts
import { useCompanyPath } from '@/composables/useCompanyPath'

const { companyId, companyPath } = useCompanyPath()

// companyId — Ref<string> con el UUID de la empresa activa
console.log(companyId.value)  // '550e8400-...'

// companyPath() — construye URLs relativas a la empresa activa
companyPath('/settings')  // '/companies/mi-empresa/settings'
companyPath('/members')   // '/companies/mi-empresa/members'

// Navegar a otra sección de la empresa activa
router.push(companyPath('/audit'))
```

::: tip
`companyPath` resuelve el parámetro usando el **slug** si está disponible, para mantener URLs legibles. Usa siempre `companyPath()` en lugar de construir las URLs manualmente.
:::
