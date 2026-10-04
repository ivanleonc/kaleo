# `useAppTable` y TanStack Table

Wrapper de TanStack Vue Table v9 con las convenciones del proyecto pre-configuradas.

## `appFeatures` — feature set canónico

Todas las tablas de Kaleo usan el **mismo objeto de features** (`appFeatures`). Esto garantiza consistencia y evita configurar TanStack desde cero en cada módulo:

```ts
// Internamente en useAppTable.ts
export const appFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel:       createSortedRowModel(),
  columnFilteringFeature,
  filteredRowModel:     createFilteredRowModel(),
  globalFilteringFeature,
  rowPaginationFeature,
  paginatedRowModel:    createPaginatedRowModel(),
  columnVisibilityFeature,
  columnPinningFeature,
  sortFns: { basic, alphanumeric, text, datetime },
  filterFns: { includesString, equalsString },
  columnMeta: {} as { label?: string; align?: 'left' | 'center' | 'right' },
})

export type AppFeatures = typeof appFeatures
```

## `createAppColumnHelper<T>()` — definir columnas

```ts
// frontend/src/composables/useInvoiceColumns.ts
import { createAppColumnHelper } from '@/composables/useAppTable'
import type { Invoice } from '@/types/invoice'

const helper = createAppColumnHelper<Invoice>()

export function useInvoiceColumns() {
  return [
    helper.accessor('number', {
      header: 'Número',
      meta: { label: 'Número' },         // Para accesibilidad en mobile
    }),
    helper.accessor('amount', {
      header: 'Monto',
      meta: { label: 'Monto', align: 'right' },  // Alineación en header + celdas
    }),
    helper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado' },
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones' },
      // Las celdas de acción usan el slot #cell-actions en UiDataTable
    }),
  ]
}
```

## `AppColumnDef<TData>` — tipo de columna

```ts
export type AppColumnDef<TData extends RowData> = ColumnDef<AppFeatures, TData, any>
```

El `any` en el tercer parámetro es intencional — TanStack es invariante en el tipo de valor de celda, y cada columna puede retornar un tipo distinto.

## `useAppTable()` — hook principal

```ts
export function useAppTable<TData extends RowData>(
  options: Omit<TableOptionsWithReactiveData<AppFeatures, TData>, 'features'>
)
```

::: warning Siempre pasar `data` como `ref` o `computed`
TanStack solo reacciona a refs/computed. En DEV, `useAppTable` emite un `console.warn` si detecta que `data` no es reactivo.

```ts
// ❌ Incorrecto — congela la tabla con los datos del mount
data: memberStore.members

// ✅ Correcto
data: computed(() => memberStore.members)
```
:::

## Sort server-side

TanStack maneja el sort en el cliente por defecto. Para sort server-side (la mayoría de tablas en Kaleo), se usa el modo controlado:

### Tipos de sort

```ts
// TanStack → Servidor
interface ServerSort {
  sortBy?: string      // nombre de columna
  sortDir?: 'asc' | 'desc'
}

// Conversión
sortingStateToServer([{ id: 'name', desc: false }])
// → { sortBy: 'name', sortDir: 'asc' }

serverToSortingState({ sortBy: 'created_at', sortDir: 'desc' })
// → [{ id: 'created_at', desc: true }]
```

### `useControlledSorting`

Puente entre el estado de sorting de Vue y el estado controlado de TanStack:

```ts
const sorting = useSortingState()  // Ref<SortingState>

const controlledSortOptions = useControlledSorting(sorting, (newSorting) => {
  // Llamado cuando el usuario hace clic en un header de columna
  store.setSort(sortingStateToServer(newSorting)).catch(() => {})
})

const table = useAppTable<Invoice>({
  columns: useInvoiceColumns(),
  data: computed(() => store.items),
  manualSorting: true,
  manualPagination: true,
  autoResetPageIndex: false,
  ...controlledSortOptions,  // Propaga state + onSortingChange a TanStack
})
```

::: tip
`useTableView` hace todo esto automáticamente. Solo usa `useControlledSorting` directamente si necesitas opciones de tabla especiales que `useTableView` no expone.
:::

## Convenciones baked-in

| Convención | Valor | Razón |
|---|---|---|
| `enableMultiSort` | `false` | Una sola columna a la vez, como la mayoría de UIs |
| `enableSortingRemoval` | `false` | Clic alterna asc↔desc, sin tercer estado "sin sort" |
| `getRowId` | `row.id` | Todas las entidades tienen un campo `id` |

## Column meta

El campo `meta` de cada columna tiene un tipo definido:

```ts
// Disponible en todos los headers y celdas via column.columnDef.meta
columnMeta: {} as {
  label?: string          // Etiqueta para mobile cards y aria-label
  align?: 'left' | 'center' | 'right'  // Alineación del header y celda
}
```

`UiDataTable` usa `meta.label` para renderizar las tarjetas móvil y `meta.align` para las alineaciones CSS.
