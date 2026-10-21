# Crear un Reporte exportable

> **Cuándo usar este patrón:** Lista de datos de solo lectura con filtros (incluidos rangos de fecha), paginación por cursor o por offset, y exportación a CSV/Excel.
> **Referencia viva:** `AuditView.vue`, `audit.store.ts`

---

## Diferencia clave con un CRUD

| Aspecto | CRUD | Reporte |
|---|---|---|
| Operaciones | Crear, editar, eliminar | Solo lectura |
| Paginación | Offset (page/limit) | Cursor (más eficiente en logs grandes) |
| Exportación | No siempre | Siempre o casi siempre |
| Filtros de fecha | Opcionales | Casi siempre |
| Feature component | Tabla | Tabla, timeline, o grilla según dominio |

---

## Mapa de archivos

```
Backend
  backend/src/reports/
    repositories/sale-report.repository.ts
    sale-report.service.ts
    sale-report.controller.ts
    sale-report.module.ts

Frontend
  frontend/src/types/sale-report.ts
  frontend/src/services/sale-report.service.ts
  frontend/src/stores/sale-report.store.ts      ← si es offset
  frontend/src/composables/useSaleReportColumns.ts
  frontend/src/components/features/reports/SaleReportTable.vue
  frontend/src/views/SaleReportView.vue
```

---

## Paso a paso — Frontend (las partes que difieren del CRUD)

### Store para reportes offset (simple)

Si el reporte usa paginación offset igual que un CRUD, el store es idéntico a `branch.store.ts` con `usePaginatedSetup`. Sin CRUD, sin filtros en el store:

```ts
// El store más simple posible — solo lectura paginada
export const useSaleReportStore = defineStore('sale-report', () => {
  const paginated = usePaginatedSetup<SaleReport, SaleReportFilters>({
    fetchFn: saleReportService.getReports.bind(saleReportService),
    defaultFilters: { from: undefined, to: undefined, status: undefined },
  });

  return {
    ...paginated,
    reports: paginated.items,
    fetchReports: (p?: number) => paginated.fetch(p),
    // Sin métodos CRUD
  };
});
```

### Store para reportes por cursor (como Audit)

Ver `audit.store.ts` como referencia. Los puntos clave:
- `cursorStack: ref<Array<string | null>>([null])` — pila de cursores para "Anterior"
- `setFilters` reinicia la pila a `[null]` (vuelve a la primera página)
- `nextPage` empuja el cursor actual; `prevPage` lo saca

### Filtros de fecha

Usa el slot `#filter-{key}` de `UiTableFilters` para rangos de fecha:

```html
<UiTableFilters v-model="filterValues" :filters="filterDefs">
  <template #filter-from="{ values, update }">
    <span class="filter-dates-label">Período:</span>
    <div class="filter-dates">
      <input :value="values.from" type="date" @input="update('from', $event.target.value)" />
      <span>hasta</span>
      <input :value="values.to" type="date" @input="update('to', $event.target.value)" />
    </div>
  </template>
</UiTableFilters>
```

En el `filterDefs`, incluye el campo `from` con `type: 'date'` para que `UiTableFilters` reserve el slot:

```ts
const filterDefs: TableFilterDef[] = [
  { key: 'from', type: 'date', label: 'Desde' },
  // El campo 'to' se maneja dentro del slot de 'from'
];
```

### Exportación CSV o Excel

1. Usa el helper `fetchExportFile` de `@/api/export`: pide el archivo al backend y devuelve `{ blob, filename }` (el nombre sale del `Content-Disposition`):

```ts
async exportReports(params: {
  from?: string;
  to?: string;
  format: ExportFormat;
}): Promise<ExportedFile> {
  return fetchExportFile('/companies/sale-reports/export', {
    ...params,
    columns: params.columns?.join(','),
  });
}
```

2. En la view, pasa el fetcher a `UiExportMenu` (ofrece CSV y Excel):

```html
<UiExportMenu :fetcher="exportReports" />
```

```ts
function exportReports(format: ExportFormat) {
  return saleReportService.exportReports({
    from: filterValues.value.from || undefined,
    to:   filterValues.value.to   || undefined,
    format,
  });
}
```

`UiExportMenu` maneja internamente la descarga (Blob → `<a>` click → revoke URL) y los toasts.

::: tip Columnas visibles
Si la tabla es TanStack, agrega también `UiTableColumnMenu` y envía `visibleColumnIds` en el parámetro `columns`: el archivo contendrá exactamente las columnas que el usuario está viendo. Ver [Exportaciones](/backend/api/exportaciones).
:::

### Estructura de la view

```vue
<template>
  <AuthenticatedLayout>
    <UiPageHeader title="Reporte de Ventas">
      <template #actions>
        <UiTableColumnMenu :table="reportTable" />
        <UiExportMenu :fetcher="exportReports" />
      </template>
    </UiPageHeader>

    <UiTableFilters v-model="filterValues" :filters="filterDefs">
      <!-- slot #filter-from para rango de fechas -->
    </UiTableFilters>

    <!-- Loading skeleton -->
    <!-- Error state -->
    <!-- Empty state -->

    <!-- Tabla o timeline del dominio -->
    <SaleReportTable
      :table="reportTable"
      :loading="isInitialLoading"
      :error="reportStore.error"
      @retry="reportStore.fetchReports()"
    />

    <!-- Paginación: UiPagination (offset) o UiCursorPagination (cursor) -->
  </AuthenticatedLayout>
</template>
```

---

## Backend — endpoint de exportación

Usa el servicio compartido `TabularExportService` (`backend/src/common/export`): resuelve columnas, aplica el tope de filas y genera CSV o XLSX.

```ts
@Get('export')
@UseGuards(PermissionsGuard)
@RequirePermissions(Permissions.REPORTS.READ)
async exportReports(
  @Headers('x-company-id') companyId: string,
  @Query() query: ReportExportQueryDto,
) {
  const file = await this.reportService.exportReports(
    companyId,
    { from: query.from, to: query.to },
    { sortBy, sortDir },
    query.format ?? 'csv',
    query.columns,
  );

  return exportFileToStreamable(file);
}
```

Las columnas exportables se declaran en un archivo de dominio (p. ej. `report-export.columns.ts`) con el tipo `ExportColumn<T>`:

```ts
export const REPORT_EXPORT_COLUMNS: ExportColumn<ReportRow>[] = [
  { id: 'name', header: 'Reporte', value: (row) => row.name },
  { id: 'total', header: 'Total', value: (row) => row.total, numFmt: '#,##0.00' },
];
```

---

## Checklist pre-PR

- [ ] El endpoint de lista no expone datos de otras empresas (filtro por `company_id`)
- [ ] El endpoint de exportación aplica los mismos filtros que la lista
- [ ] El store NO tiene métodos create/update/delete
- [ ] Los filtros de fecha se validan en el DTO (`@IsISO8601`, `@IsOptional`)
- [ ] `UiExportMenu` recibe el fetcher sin llamarlo directamente
- [ ] Las columnas exportables están declaradas en un `*-export.columns.ts` del dominio


