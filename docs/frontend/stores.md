# Stores (Pinia)

Kaleo tiene 5 stores Pinia, todos usando el **Setup Store** style (función setup, no Options API).

## `auth.store.ts` — sesión y permisos

El store más complejo. Gestiona el ciclo de vida de la sesión JWT y los permisos por empresa.

### Estado

```ts
const user = ref<AuthUser | null>(null)          // Usuario actual
const accessToken = ref<string | null>(null)      // Token de acceso (15 min)
const refreshToken = ref<string | null>(null)     // Token de refresco (7 días)
const activeTenantId = ref<string | null>(null)   // Empresa activa
```

### Persistencia

```ts
persist: {
  key: STORAGE_KEYS.authStorage,
  pick: ['user', 'activeTenantId', 'refreshToken'],
}
```

Solo persiste lo necesario — el `accessToken` no se persiste por seguridad.

### Computed principales

```ts
const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
const isSuperAdmin = computed(() => user.value?.is_super_admin === true)
const currentTenant = computed(() =>
  user.value?.tenants?.find(t => t.id === activeTenantId.value)
)
```

### Métodos clave

| Método | Descripción |
|---|---|
| `login(email, password)` | Llama al servicio, llama a `setSession()` |
| `logout()` | Limpia tokens, estado y localStorage |
| `refreshTokens()` | Renueva access + refresh token; en fallo llama logout() |
| `fetchProfile()` | Actualiza `user` desde el servidor |
| `setActiveTenant(id)` | Cambia empresa activa + persiste en localStorage |
| `healActiveTenant()` | Restaura activeTenantId desde localStorage (usado en router guard) |
| `hasPermission(code)` | Verifica permiso en la empresa activa |
| `hasRole(role)` | Verifica rol en la empresa activa |
| `updateTenant(id, patch)` | Actualiza datos de un tenant en memoria (post-edición) |
| `updateProfileData(patch)` | Actualiza datos del usuario en memoria (post-edición) |

---

## `company.store.ts` — empresas

Gestiona la lista de todas las empresas (solo super-admin) y operaciones de CRUD de empresa.

```ts
const allCompanies = ref<CompanySummary[]>([])
const allCompaniesLoaded = ref(false)

// Métodos
fetchAllCompanies()     // Solo super-admin — carga todas las empresas del sistema
updateCompany(id, data) // Actualiza empresa + parchea auth store en memoria
createCompany(data)     // Crea empresa + agrega tenant al auth store + cambia activa
```

---

## `branch.store.ts` — patrón canónico de CRUD paginado

Este es el store más simple que usa `usePaginatedSetup`. Úsalo como plantilla para nuevos módulos:

```ts
// frontend/src/stores/branch.store.ts
export const useBranchStore = defineStore('branch', () => {
  // 1. Setup paginado — provee items, isLoading, error, fetch, applyFilters, setSort, etc.
  const paginated = usePaginatedSetup<Branch, BranchFilters>({
    fetchFn: branchService.getBranches.bind(branchService),
    defaultFilters: { search: undefined, status: undefined },
  })

  // 2. Alias de compatibilidad para las views
  const branches = paginated.items
  const fetchBranches = (p?: number) => paginated.fetch(p)

  // 3. CRUD usando paginated.withLoading (mismo isLoading/error que la lista)
  const createBranch = async (payload: CreateBranchPayload) => {
    const result = await paginated.withLoading(async () => {
      const res = await branchService.createBranch(payload)
      await paginated.refresh()
      return res.data
    }, 'Error al crear la sede')
    return result
  }

  // ... updateBranch, deleteBranch con el mismo patrón

  return { ...paginated, branches, fetchBranches, createBranch, updateBranch, deleteBranch }
})
```

### Lo que `usePaginatedSetup` provee automáticamente

| Propiedad / Método | Descripción |
|---|---|
| `items` | Array reactivo de la página actual |
| `isLoading` | Estado de carga (compartido para list + CRUD) |
| `error` | Mensaje de error del último fallo |
| `page`, `limit`, `total`, `totalPages` | Estado de paginación |
| `hasPrev`, `hasNext` | Flags de navegación |
| `filters`, `sortBy`, `sortDir` | Estado de filtros y orden |
| `fetch(page?)` | Carga la página indicada |
| `goToPage(n)` | Navega a una página específica (clamped) |
| `setLimit(n)` | Cambia el tamaño de página |
| `applyFilters(partial)` | Aplica filtros y vuelve a la página 1 |
| `clearFilters()` | Limpia filtros y recarga |
| `setSort(sort)` | Cambia el sort y vuelve a la página 1 |
| `refresh()` | Recarga la página actual |
| `resetState()` | Limpia todo el estado |
| `withLoading(fn, msg)` | Wrapper async con isLoading/error |

---

## `member.store.ts` — CRUD extendido con multi-empresa

Mismo patrón que `branch.store`, pero con operaciones adicionales de dominio:

```ts
// Operaciones extra sobre la paginación base
addMember(payload)                        // Crear + refresh
updateMember(userId, payload)             // Actualizar + refresh
removeMember(userId)                      // Eliminar + refresh
resetPassword(userId)                     // Generar nueva contraseña temporal
resetPasswordAndSendEmail(userId)         // Resetear + enviar por email

// Multi-empresa
memberCompanies: Ref<MemberCompany[]>     // Empresas de un miembro
fetchUserCompanies(userId)                // Cargar empresas del miembro
attachMemberToCompany(companyId, payload) // Asignar a empresa
detachMemberFromCompany(companyId, userId)// Quitar de empresa
searchUsers(query)                        // Búsqueda de autocompletado
```

---

## `audit.store.ts` — paginación por cursor

El store de auditoría usa **cursor pagination** (no offset). La diferencia:

```ts
// Offset: skip N registros (lento en tablas grandes)
SELECT * FROM logs ORDER BY created_at DESC LIMIT 20 OFFSET 200

// Cursor: empieza desde un punto (eficiente)
SELECT * FROM logs WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20
```

El store mantiene una **pila de cursores** para permitir navegación hacia atrás:

```ts
const cursorStack = ref<Array<string | null>>([null])  // null = primera página
const nextCursor = ref<string | null>(null)
const hasNext = ref(false)

// Ir a la siguiente página
const nextPage = async () => {
  if (!nextCursor.value) return
  cursorStack.value.push(nextCursor.value)
  await fetchLogs()
}

// Volver a la página anterior
const prevPage = async () => {
  if (cursorStack.value.length <= 1) return
  cursorStack.value.pop()
  await fetchLogs()
}

// Resetear al cambiar filtros (vuelve a la primera página)
const setFilters = async (filters) => {
  cursorStack.value = [null]  // ← importante: reinicia la pila
  await fetchLogs(filters)
}
```

---

## Plantilla para nuevo store paginado

```ts
// frontend/src/stores/invoice.store.ts
import { defineStore } from 'pinia'
import { invoiceService } from '@/services/invoice.service'
import { usePaginatedSetup } from '@/composables/createPaginatedStore'
import type { Invoice } from '@/types/invoice'

export interface InvoiceFilters extends Record<string, unknown> {
  search?: string
  status?: string
}

export const useInvoiceStore = defineStore('invoice', () => {
  const paginated = usePaginatedSetup<Invoice, InvoiceFilters>({
    fetchFn: invoiceService.getInvoices.bind(invoiceService),
    defaultFilters: { search: undefined, status: undefined },
  })

  const invoices = paginated.items
  const fetchInvoices = (p?: number) => paginated.fetch(p)

  const createInvoice = async (payload: CreateInvoicePayload) => {
    return paginated.withLoading(async () => {
      const res = await invoiceService.createInvoice(payload)
      await paginated.refresh()
      return res.data
    }, 'Error al crear la factura')
  }

  return { ...paginated, invoices, fetchInvoices, createInvoice }
})
```

::: tip
El `...paginated` spread expone todas las propiedades del setup paginado directamente en el store. `invoices` y `fetchInvoices` son alias de `paginated.items` y `paginated.fetch` para mantener nombres consistentes con el dominio.
:::
