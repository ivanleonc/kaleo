# Multi-tenant

Kaleo es una plataforma **multi-tenant**: múltiples empresas conviven en la misma base de datos y el mismo servidor, con datos completamente aislados entre sí.

## Concepto fundamental

Cada usuario puede pertenecer a **múltiples empresas** con roles distintos en cada una. La empresa activa se determina en cada request a través del header `x-company-id`.

```
Usuario: ivan@empresa.com
  ├── Empresa A (id: uuid-A) → rol: Owner
  ├── Empresa B (id: uuid-B) → rol: Admin
  └── Empresa C (id: uuid-C) → rol: Viewer
```

## `activeTenantId` en el frontend

El store `auth` mantiene la empresa activa en memoria y en `localStorage`:

```ts
// auth.store.ts
const activeTenantId = ref<string | null>(null)

// Cambiar de empresa
function setActiveTenant(tenantId: string) {
  activeTenantId.value = tenantId
  localStorage.setItem(STORAGE_KEYS.activeTenant, tenantId)
}
```

En cada recarga de página, `healActiveTenant()` restaura el valor desde `localStorage`:

```ts
// Llamado en router.beforeEach
function healActiveTenant() {
  if (!activeTenantId.value) {
    const stored = localStorage.getItem(STORAGE_KEYS.activeTenant)
    if (stored) setActiveTenant(stored)
  }
}
```

## Estructura de URL

Todas las rutas autenticadas incluyen el identificador de la empresa:

```
/companies/:companyId/dashboard
/companies/:companyId/members
/companies/:companyId/settings
```

El `:companyId` puede ser un **UUID** o un **slug** (texto legible). El navigation guard canonicaliza automáticamente los UUIDs a slugs con `router.replace()`.

## Header `x-company-id`

**Todos los endpoints de recursos** requieren este header:

```http
GET /api/companies/branches HTTP/1.1
Authorization: Bearer eyJhbGci...
x-company-id: 550e8400-e29b-41d4-a716-446655440000
```

El interceptor de axios lo inyecta automáticamente desde `localStorage.activeTenant`:

```ts
// api/axios.ts — request interceptor
config.headers['x-company-id'] =
  explicitHeader ||
  localStorage.getItem('activeTenant') ||
  authStorageUser?.activeTenantId
```

## `CompanyAccessGuard`

En el backend, este guard valida que el usuario tenga acceso a la empresa del header:

1. Lee `x-company-id` del request
2. Verifica en `user_contexts` que `user_id + company_id` existe
3. Si el usuario es `is_super_admin`, permite el acceso sin verificación de membresía
4. Si el header falta o el usuario no pertenece → `403 Forbidden`

## Super-administrador

El flag `is_super_admin` en la tabla `users` otorga acceso virtual a **todas las empresas** sin necesidad de ser miembro.

::: danger Seguridad
Este flag **solo se puede otorgar vía SQL directo** en la base de datos. No existe ningún endpoint que lo escriba. Esto hace imposible la escalada de privilegios desde la aplicación.

```sql
-- Otorgar
UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@ejemplo.com';

-- Revocar (+ invalidar sesiones activas)
UPDATE users SET is_super_admin = FALSE WHERE email = 'admin@ejemplo.com';
DELETE FROM refresh_tokens WHERE user_id = '<user-id>';
```
:::

## Cambiar de empresa (frontend)

```ts
// En cualquier componente
const authStore = useAuthStore()
const router = useRouter()
const { companyPath } = useCompanyPath()

async function switchCompany(tenantId: string) {
  authStore.setActiveTenant(tenantId)
  // Navegar al dashboard de la nueva empresa
  await router.push(companyPath('/dashboard'))
}
```

Al cambiar de empresa, los stores paginados detectan el cambio de `companyId` y resetean su estado automáticamente (via `usePaginatedSetup`).

## `useCompanyPath` composable

```ts
const { companyId, companyPath } = useCompanyPath()

// companyId: Ref<string> — UUID de la empresa activa
// companyPath('/settings') → '/companies/mi-empresa/settings'

// Navegar dentro de la empresa activa
router.push(companyPath('/members'))
```
