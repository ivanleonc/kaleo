# `useTableView`

Configura una tabla TanStack paginada con sort server-side en una sola línea.

## Problema que resuelve

Este bloque de ~14 líneas se repetía en cada vista con tabla paginada:

```ts
// ❌ Antes — 14 líneas idénticas en MembersView y BranchesView
const memberSorting = useSortingState()
const memberTable = useAppTable<Member>({
  columns: useMemberColumns(),
  data: computed(() => memberStore.members),
  manualSorting: true,
  manualPagination: true,
  autoResetPageIndex: false,
  ...useControlledSorting(memberSorting, (sorting) => {
    memberStore.setSort(sortingStateToServer(sorting)).catch(() => {})
  }),
})
const isInitialLoading = computed(
  () => memberStore.isLoading && memberStore.members.length === 0
)
```

Con `useTableView`:

```ts
// ✅ Ahora — 1 línea
const { table, isInitialLoading } = useTableView(useMemberColumns(), memberStore)
```

## Requisito del store

El store debe exponer estas 3 propiedades (cualquier store creado con `usePaginatedSetup` las tiene automáticamente):

```ts
interface TableViewStore<T> {
  items: T[]           // Array reactivo de la página actual
  isLoading: boolean   // Estado de carga
  setSort: (sort: ServerSort) => Promise<void>  // Aplica sort server-side
}
```

## API

```ts
function useTableView<T extends RowData>(
  columns: AppColumnDef<T>[],
  store: TableViewStore<T>,
): {
  table: AppVueTable<AppFeatures, T, {}, {}, {}>
  isInitialLoading: ComputedRef<boolean>
}
```

### `isInitialLoading`

```ts
// true solo cuando: loading=true Y no hay datos previos
const isInitialLoading = computed(
  () => store.isLoading && store.items.length === 0
)
```

Esto significa:
- **Primera carga:** `isInitialLoading=true` → muestra el skeleton
- **Re-fetch (cambio de filtro/página):** `isInitialLoading=false` → la tabla existente sigue visible mientras recarga

## Por qué `data` debe ser computed

TanStack Table solo reacciona a **refs o computed**. Si se pasa el array directamente (que Pinia desenvuelve), la tabla "congela" los datos del mount:

```ts
// ❌ Incorrecto — Pinia desenvuelve el ref → array plano → tabla no reacciona
data: store.items

// ✅ Correcto — useTableView lo hace automáticamente
data: computed(() => store.items)
```

::: warning
Si ves que la tabla no actualiza al cambiar de página o filtrar, este es el bug más probable. `useTableView` lo previene internamente.
:::

## Los filtros son separados

`useTableView` maneja **sort** y **datos**, pero **no filtros**. Los filtros siguen siendo responsabilidad de la view via `useFilterSync`. Esta separación permite que:

1. La view decida qué filtros mostrar y cómo mapearlos
2. El sort y la tabla estén siempre configurados correctamente sin código repetido

```ts
// View típica con useTableView + useFilterSync
const { table, isInitialLoading } = useTableView(useInvoiceColumns(), invoiceStore)

const filterValues = ref({ search: '', status: '' })
useFilterSync(filterValues, v => invoiceStore.applyFilters({
  search: v.search || undefined,
  status: v.status || undefined,
}))
```

## Ejemplo completo en una view

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useInvoiceStore } from '@/stores/invoice.store'
import { useInvoiceColumns } from '@/composables/useInvoiceColumns'
import { useTableView } from '@/composables/useTableView'
import { useFilterSync } from '@/composables/useFilterSync'
import { useCompanyPath } from '@/composables/useCompanyPath'

const invoiceStore = useInvoiceStore()
const { companyId } = useCompanyPath()

// 1 línea para configurar toda la tabla con sort server-side
const { table, isInitialLoading } = useTableView(useInvoiceColumns(), invoiceStore)

// Filtros por separado
const filterValues = ref({ search: '', status: '' })
watch(companyId, () => { filterValues.value = { search: '', status: '' } })
useFilterSync(filterValues, v => invoiceStore.applyFilters({ search: v.search || undefined }))

onMounted(() => invoiceStore.fetchInvoices())
</script>

<template>
  <InvoiceTable
    :table="table"
    :loading="isInitialLoading"
    :error="invoiceStore.error"
    @retry="invoiceStore.fetchInvoices()"
  />
  <UiPagination
    :page="invoiceStore.page"
    :total="invoiceStore.total"
    :limit="invoiceStore.limit"
    @update:page="invoiceStore.goToPage"
    @update:limit="invoiceStore.setLimit"
  />
</template>
```
