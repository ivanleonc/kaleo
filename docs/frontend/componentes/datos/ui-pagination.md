# UiPagination

Barra de paginación por offset con selector de tamaño de página.

## Props

| Prop | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `page` | number | ✅ | — | Página actual |
| `total` | number | ✅ | — | Total de registros |
| `limit` | number | ✅ | — | Items por página actual |
| `showPageSize` | boolean | — | `false` | Muestra selector de tamaño de página |

## Emits

| Evento | Payload | Descripción |
|---|---|---|
| `update:page` | `number` | Nueva página seleccionada |
| `update:limit` | `number` | Nuevo tamaño de página |

## Ejemplo

```vue
<UiPagination
  :page="invoiceStore.page"
  :total="invoiceStore.total"
  :limit="invoiceStore.limit"
  show-page-size
  @update:page="invoiceStore.goToPage"
  @update:limit="invoiceStore.setLimit"
/>
```

## Comportamiento

- Se oculta automáticamente cuando `totalPages <= 1` Y `showPageSize` es `false`
- Muestra texto de rango: "1–20 de 150"
- Para rangos grandes de páginas, muestra "..." para condensar (ej: `1 2 3 ... 8 9 10`)
- Los botones Anterior y Siguiente se deshabilitan en los límites
- `aria-current="page"` en la página activa para accesibilidad
