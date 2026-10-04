# UiCursorPagination

Paginación por cursor para listas con grandes volúmenes de datos (como audit logs).

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `hasPrev` | boolean | — | ¿Hay página anterior? |
| `canGoNext` | boolean | — | ¿Hay página siguiente? |
| `loading` | boolean | `false` | Deshabilita botones durante la carga |
| `pageIndex` | number | — | Número de página actual (para mostrar "Página N") |
| `count` | number | — | Cantidad de items en la página actual |
| `totalLabel` | string | `'registros'` | Unidad para el contador (ej: `'eventos'`) |

## Emits

| Evento | Descripción |
|---|---|
| `prev` | Usuario pide la página anterior |
| `next` | Usuario pide la siguiente página |

## Ejemplo

```vue
<UiCursorPagination
  :has-prev="auditStore.hasPrev"
  :can-go-next="auditStore.canGoNext"
  :loading="auditStore.isLoading"
  :page-index="auditStore.pageIndex"
  :count="auditStore.logs.length"
  total-label="eventos"
  @next="auditStore.nextPage"
  @prev="auditStore.prevPage"
/>
```

## Diferencia con `UiPagination`

| | `UiPagination` | `UiCursorPagination` |
|---|---|---|
| Tipo | Offset (page/limit) | Cursor (keyset) |
| Conoce el total | ✅ | ❌ |
| Navegación directa a página N | ✅ | ❌ |
| Eficiencia en tablas grandes | Lento (OFFSET) | Rápido (índice) |
| Usado en | Members, Branches, Roles | Audit logs |
