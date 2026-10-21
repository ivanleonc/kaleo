# UiExportMenu

Menú de exportación con dos formatos: **CSV** y **Excel (.xlsx)**. El archivo lo genera el backend, así que exporta **todos los registros que cumplen los filtros**, no solo la página visible.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `fetcher` | `(format: 'csv' \| 'xlsx') => Promise<{ blob: Blob; filename: string }>` | ✅ | Descarga el archivo en el formato pedido |
| `label` | string | ❌ | Texto del botón (por defecto `Exportar`) |
| `disabled` | boolean | ❌ | Deshabilita el botón |

## Uso

```vue
<UiPageHeader title="Miembros del Equipo">
  <template #actions>
    <UiTableColumnMenu :table="memberTable" />
    <UiExportMenu :fetcher="exportMembers" />
  </template>
</UiPageHeader>

<script setup lang="ts">
import type { ExportFormat } from '@/api/export'

const { table: memberTable, visibleColumnIds } = useTableView(
  useMemberColumns(),
  memberStore,
  { initialSort, columnVisibilityKey: 'members' },
)

const exportMembers = (format: ExportFormat) =>
  memberService.exportMembers({
    search: emptyToUndefined(memberFilterValues.value.search),
    status: memberFilterValues.value.status || undefined,
    sortBy: memberStore.sortBy ?? undefined,
    sortDir: memberStore.sortDir,
    format,
    columns: visibleColumnIds.value,  // solo las columnas visibles
  })
</script>
```

## Comportamiento

1. El usuario elige CSV o Excel
2. Se llama `fetcher(format)` con los filtros y las columnas visibles del momento
3. Se descarga el blob con el nombre que envía el backend
4. Se muestra un toast de éxito o el mensaje de error real del backend (por ejemplo, el 413 cuando el resultado supera el límite de 10.000 filas)

## Notas

- El helper `fetchExportFile` de `@/api/export` extrae el nombre del `Content-Disposition` y convierte los errores JSON del backend (que llegan como `Blob`) en `Error` con mensaje legible
- El límite de filas (10.000) vive en el backend: `EXPORT_MAX_ROWS` en `backend/src/common/export/export.types.ts`
- El menú se cierra y devuelve el foco al botón cuando se elige un formato
