# `usePaginatedSetup` / `createPaginatedStore`

Elimina el boilerplate de ~80 líneas que aparece en cada módulo con lista paginada.

## Problema que resuelve

Antes de este composable, cada store paginado repetía:

```ts
// ❌ Antes — ~80 líneas idénticas en CADA store
const items = ref<X[]>([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const filters = ref({})
const sortBy = ref<string | undefined>(undefined)
const sortDir = ref<'asc' | 'desc'>('asc')
const lastCompanyId = ref<string | undefined>(undefined)
const isLoading = ref(false)
const error = ref<string | null>(null)

const totalPages = computed(...)
const hasPrev = computed(...)
const hasNext = computed(...)
// ... fetch(), goToPage(), setLimit(), applyFilters(), clearFilters(), setSort(), refresh()
// ... resetState() en cada cambio de empresa
```

Ahora:

```ts
// ✅ Ahora — 4 líneas
const paginated = usePaginatedSetup<Branch, BranchFilters>({
  fetchFn: branchService.getBranches.bind(branchService),
  defaultFilters: { search: undefined, status: undefined },
})
```

## API

### Configuración

```ts
interface PaginatedStoreConfig<T, F extends Record<string, unknown>> {
  fetchFn: (params: F & { page, limit, sortBy?, sortDir? }) => Promise<PagedResponse>
  defaultFilters: F
  defaultLimit?: number  // default: 20
}
```

::: warning
`F` (tipo de filtros) debe extender `Record<string, unknown>`:
```ts
// ✅ Correcto
export interface BranchFilters extends Record<string, unknown> {
  search?: string
  status?: string
}

// ❌ Incorrecto — causa error TypeScript
export interface BranchFilters {
  search?: string
}
```
:::

### `fetchFn` — forma aceptada

El composable normaliza automáticamente dos formas de respuesta:

```ts
// Forma A: respuesta directa del servicio (la más común en este proyecto)
async getInvoices(): Promise<InvoicesResponse>  // { success, data[], total, page, limit }

// Forma B: envuelta en axios
async getInvoices(): Promise<{ data: InvoicesResponse }>

// Ambas funcionan — el composable detecta cuál es cuál
```

### Propiedades retornadas

| Propiedad | Tipo | Descripción |
|---|---|---|
| `items` | `Ref<T[]>` | Array de la página actual |
| `isLoading` | `Ref<boolean>` | Estado de carga (list + CRUD) |
| `error` | `Ref<string\|null>` | Último error |
| `page` | `Ref<number>` | Página actual |
| `limit` | `Ref<number>` | Items por página |
| `total` | `Ref<number>` | Total de registros en el servidor |
| `totalPages` | `ComputedRef<number>` | Total de páginas |
| `hasPrev` | `ComputedRef<boolean>` | ¿Hay página anterior? |
| `hasNext` | `ComputedRef<boolean>` | ¿Hay página siguiente? |
| `filters` | `Ref<F>` | Estado de filtros activos |
| `sortBy` | `Ref<string\|undefined>` | Columna de sort activa |
| `sortDir` | `Ref<'asc'\|'desc'>` | Dirección del sort |

### Métodos retornados

| Método | Descripción |
|---|---|
| `fetch(targetPage?)` | Carga la página indicada (default: página actual) |
| `goToPage(n)` | Navega a una página específica (clamped 1..totalPages) |
| `setLimit(n)` | Cambia tamaño de página y recarga desde 1 |
| `applyFilters(partial)` | Fusiona filtros y vuelve a página 1 |
| `clearFilters()` | Resetea filtros a `defaultFilters` y recarga |
| `setSort(sort)` | Cambia `sortBy`/`sortDir` y recarga desde 1 |
| `refresh()` | Recarga la página actual sin cambiar filtros ni sort |
| `resetState()` | Limpia items, paginación, filtros y sort |
| `withLoading(fn, msg?)` | Ejecuta `fn` con `isLoading=true` y captura errores |

## Cambio automático de empresa

El composable detecta cuando cambia la empresa activa y **resetea el estado automáticamente**:

```ts
// Internamente:
if (companyId.value !== lastCompanyId.value) {
  resetState()
  lastCompanyId.value = companyId.value
}
```

No necesitas hacer nada adicional — al cambiar de empresa, la tabla vuelve a la página 1 con filtros limpios.

## `usePaginatedSetup` vs `createPaginatedStore`

| | `usePaginatedSetup` | `createPaginatedStore` |
|---|---|---|
| Uso | Dentro de `defineStore()` | Genera el store completo |
| CRUD | Agrega métodos propios | No — solo lectura |
| Cuándo | Módulos con crear/editar/eliminar | Solo listas de consulta |

```ts
// usePaginatedSetup — para módulos con CRUD
export const useBranchStore = defineStore('branch', () => {
  const paginated = usePaginatedSetup<Branch, BranchFilters>({ ... })
  const createBranch = async (payload) => paginated.withLoading(...)
  return { ...paginated, createBranch }
})

// createPaginatedStore — para listas de solo lectura
const useProductCatalog = createPaginatedStore<Product, ProductFilters>({
  id: 'product-catalog',
  fetchFn: catalogService.getProducts,
  defaultFilters: {},
})
```

## Patrón completo de store CRUD

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

  // Alias de compatibilidad
  const invoices = paginated.items
  const fetchInvoices = (p?: number) => paginated.fetch(p)

  // CRUD — reutiliza el mismo isLoading/error de la lista
  const createInvoice = async (payload: CreateInvoicePayload) => {
    return paginated.withLoading(async () => {
      const res = await invoiceService.createInvoice(payload)
      await paginated.refresh()
      return res.data
    }, 'Error al crear la factura')
  }

  const updateInvoice = async (id: string, payload: UpdateInvoicePayload) => {
    await paginated.withLoading(async () => {
      await invoiceService.updateInvoice(id, payload)
      await paginated.refresh()
    }, 'Error al actualizar la factura')
  }

  const deleteInvoice = async (id: string) => {
    await paginated.withLoading(async () => {
      await invoiceService.deleteInvoice(id)
      await paginated.refresh()
    }, 'Error al eliminar la factura')
  }

  return {
    ...paginated,
    invoices,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  }
})
```
