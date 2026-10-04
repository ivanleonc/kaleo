# Guía: Crear un nuevo módulo

> **Este archivo es una referencia rápida.** El manual completo con ejemplos reales del proyecto está en [`docs/manual/`](./manual/).

## ¿Qué tipo de módulo vas a crear?

| Tipo | Guía |
|---|---|
| Lista paginada con crear/editar/eliminar | [`02-crud.md`](./manual/02-crud.md) |
| Lista de solo lectura con exportación | [`03-reporte.md`](./manual/03-reporte.md) |
| Vista con métricas y/o gráficas | [`04-dashboard.md`](./manual/04-dashboard.md) |
| Pantalla de detalle de un registro | [`05-detalle.md`](./manual/05-detalle.md) |
| Módulo que depende de otros módulos | [`06-modulo-relacionado.md`](./manual/06-modulo-relacionado.md) |

## Checklist pre-PR

Siempre terminar con → [`07-checklist.md`](./manual/07-checklist.md)

## Arquitectura general

Para entender dónde vive cada pieza → [`01-arquitectura.md`](./manual/01-arquitectura.md)

---

## Resumen ultra-rápido (CRUD estándar)

| # | Capa | Tarea |
|---|---|---|
| 1 | DB | Crear migración SQL |
| 2 | Backend | Repository + tipos de fila |
| 3 | Backend | Service |
| 4 | Backend | DTOs con validación |
| 5 | Backend | Controller con guards |
| 6 | Backend | Module + registro |
| 7 | Shared | Permisos + tipos |
| 8 | Frontend | Types |
| 9 | Frontend | Service (apiClient) |
| 10 | Frontend | Store con `usePaginatedSetup` |
| 11 | Frontend | Composable de columnas |
| 12 | Frontend | Componente feature |
| 13 | Frontend | View |
| 14 | Frontend | Ruta con lazy import |
| 15 | Tests | Test del feature component + composable |

---

## Paso a paso

### Paso 1 — Migración SQL

```sql
-- backend/src/migrations/018-add-invoices.sql
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
```

Aplicar en Supabase SQL Editor. Numeración: siguiente al último archivo en `backend/src/migrations/`.

---

### Paso 2 — Repository + tipos de fila

**`backend/src/common/types/db-rows.ts`** — agregar la interfaz:

```ts
export interface InvoiceRow {
  id: string;
  company_id: string;
  number: string;
  status: string;
  amount: string;  // Postgres NUMERIC devuelve string
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
```

**`backend/src/invoices/repositories/invoice.repository.ts`**:

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { rows, row } from '../../common/utils/db.js';
import { buildWhere, buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
import type { InvoiceRow } from '../../common/types/db-rows.js';

@Injectable()
export class InvoiceRepository {
  constructor(private dataSource: DataSource) {}

  async findPaged(companyId: string, page = 1, limit = 20, sort: SortSpec = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { where, values, nextIndex } = buildWhere([
      { clause: 'company_id = $?', value: companyId },
      { clause: 'deleted_at IS NULL' },
    ], 1);

    const SORT_COLUMNS = { number: 'number', status: 'status', amount: 'amount', due_date: 'due_date', created_at: 'created_at' };
    const orderBy = buildOrderBy(SORT_COLUMNS, sort, 'created_at');

    const [countResult, data] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as total FROM invoices WHERE ${where}`, values),
      rows<InvoiceRow>(await this.dataSource.query(
        `SELECT * FROM invoices WHERE ${where} ORDER BY ${orderBy} LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
        [...values, safeLimit, offset],
      )),
    ]);

    return { data, total: parseInt(countResult[0]?.total ?? '0', 10), page: safePage, limit: safeLimit };
  }

  async findById(id: string, companyId: string): Promise<InvoiceRow | undefined> {
    return row<InvoiceRow>(await this.dataSource.query(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    ));
  }

  // create / update / delete siguen el mismo patrón...
}
```

---

### Paso 3 — Service

```ts
// backend/src/invoices/invoice.service.ts
@Injectable()
export class InvoiceService {
  constructor(private invoiceRepo: InvoiceRepository) {}

  async list(companyId: string, query: PaginationQueryDto) {
    return this.invoiceRepo.findPaged(companyId, query.page, query.limit, { sortBy: query.sortBy, sortDir: query.sortDir });
  }

  async getOne(id: string, companyId: string) {
    const invoice = await this.invoiceRepo.findById(id, companyId);
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }
}
```

---

### Paso 4 — DTOs

```ts
// backend/src/invoices/dto/create-invoice.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsISO8601 } from 'class-validator';

export class CreateInvoiceDto {
  @IsString() @IsNotEmpty()
  number: string;

  @IsNumber()
  amount: number;

  @IsISO8601() @IsOptional()
  due_date?: string;
}
```

---

### Paso 5 — Controller

```ts
// backend/src/invoices/invoice.controller.ts
@Controller('companies/invoices')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
export class InvoiceController {
  @Get()
  @RequirePermissions(Permissions.INVOICES.READ)
  list(@Query() query: PaginationQueryDto, @Headers('x-company-id') companyId: string) {
    return this.invoiceService.list(companyId, query);
  }

  @Post()
  @RequirePermissions(Permissions.INVOICES.CREATE)
  create(@Body() dto: CreateInvoiceDto, @Headers('x-company-id') companyId: string) {
    return this.invoiceService.create(companyId, dto);
  }
}
```

---

### Paso 6 — Module + registro

```ts
// backend/src/invoices/invoice.module.ts
@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
```

Agregar `InvoiceModule` al array `imports` de `app.module.ts`.

---

### Paso 7 — Permisos + tipos en shared

**`packages/shared/src/permissions.ts`** — agregar el módulo:

```ts
export const Permissions = {
  // ... módulos existentes ...
  INVOICES: {
    READ:   'invoices:read',
    CREATE: 'invoices:create',
    UPDATE: 'invoices:update',
    DELETE: 'invoices:delete',
  },
} as const;
```

También agregar el `INSERT` en la migración de seeds de permisos (nueva migración si ya está aplicada la anterior).

---

### Paso 8 — Types en frontend

```ts
// frontend/src/types/invoice.ts
export interface Invoice {
  id: string;
  company_id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  amount: string;
  due_date: string | null;
  created_at: string;
}

export interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
}
```

---

### Paso 9 — Service en frontend

```ts
// frontend/src/services/invoice.service.ts
import { apiClient } from '@/api/axios';
import type { InvoicesResponse } from '@/types/invoice';

export const invoiceService = {
  async getInvoices(params?: {
    page?: number; limit?: number;
    sortBy?: string; sortDir?: 'asc' | 'desc';
  }): Promise<InvoicesResponse> {
    const response = await apiClient.get<InvoicesResponse>('/companies/invoices', { params });
    return response.data;
  },
};
```

---

### Paso 10 — Store con `usePaginatedSetup`

```ts
// frontend/src/stores/invoice.store.ts
import { defineStore } from 'pinia';
import { invoiceService } from '@/services/invoice.service';
import { usePaginatedSetup } from '@/composables/createPaginatedStore';
import type { Invoice } from '@/types/invoice';

export interface InvoiceFilters extends Record<string, unknown> {
  search?: string;
  status?: string;
}

export const useInvoiceStore = defineStore('invoice', () => {
  const paginated = usePaginatedSetup<Invoice, InvoiceFilters>({
    fetchFn: invoiceService.getInvoices.bind(invoiceService),
    defaultFilters: { search: undefined, status: undefined },
  });

  // Alias de compatibilidad
  const invoices = paginated.items;
  const fetchInvoices = (targetPage?: number) => paginated.fetch(targetPage);

  // CRUD
  const createInvoice = async (payload: CreateInvoicePayload) => {
    const result = await paginated.withLoading(async () => {
      const response = await invoiceService.create(payload);
      await paginated.refresh();
      return response.data;
    }, 'Error al crear la factura');
    return result;
  };

  return { ...paginated, invoices, fetchInvoices, createInvoice };
});
```

---

### Paso 11 — Composable de columnas

```ts
// frontend/src/composables/useInvoiceColumns.ts
import { createAppColumnHelper } from '@/composables/useAppTable';
import type { Invoice } from '@/types/invoice';

const helper = createAppColumnHelper<Invoice>();

export function useInvoiceColumns() {
  return [
    helper.accessor('number', { header: 'Número', meta: { label: 'Número' } }),
    helper.accessor('status', { header: 'Estado', meta: { label: 'Estado' } }),
    helper.accessor('amount', { header: 'Monto', meta: { label: 'Monto', align: 'right' } }),
    helper.accessor('due_date', { header: 'Vencimiento', meta: { label: 'Vencimiento' } }),
    helper.display({ id: 'actions', header: '', meta: { label: 'Acciones' } }),
  ];
}
```

---

### Paso 12 — Componente feature

```
frontend/src/components/features/invoices/
  InvoiceTable.vue       ← tabla con celdas de dominio
  InvoiceStatusBadge.vue ← badge de estado (draft/sent/paid/overdue)
  InvoiceForm.vue        ← formulario crear/editar (opcional: si es complejo)
```

`InvoiceTable.vue` sigue el mismo patrón que `MemberTable.vue`:
- Props: `table: AppVueTable<AppFeatures, Invoice, {}, {}, {}>`, `loading`, `error`, etc.
- Emits: `retry`, `edit`, `delete`
- Slots: `#empty-action`
- Celdas de dominio hardcodeadas para Invoice

---

### Paso 13 — View

```
frontend/src/views/InvoicesView.vue
```

Estructura estándar de toda view:
```vue
<template>
  <AuthenticatedLayout>
    <UiPageHeader title="Facturas">
      <template #actions>
        <UiButton v-permission="Permissions.INVOICES.CREATE" @click="openCreateModal">
          Nueva Factura
        </UiButton>
      </template>
    </UiPageHeader>

    <UiTableFilters v-model="filterValues" :filters="filterDefs" />

    <InvoiceTable
      :table="invoiceTable"
      :loading="isInitialLoading"
      :error="invoiceStore.error"
      @retry="invoiceStore.fetchInvoices()"
      @edit="openEditModal"
      @delete="openDeleteModal"
    >
      <template #empty-action>
        <UiButton v-permission="Permissions.INVOICES.CREATE" @click="openCreateModal">
          Nueva Factura
        </UiButton>
      </template>
    </InvoiceTable>

    <UiPagination ... />

    <!-- Modales: UiFormModal para crear/editar, UiConfirmDialog para borrar -->
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
// onMounted → invoiceStore.fetchInvoices()
// useCreateAction para Ctrl+K
// useFilterSync para filtros debounced
// useDirtyForm para detectar cambios no guardados
// useAppTable + useInvoiceColumns para la tabla
</script>
```

---

### Paso 14 — Ruta con lazy import

```ts
// frontend/src/router/index.ts — agregar en la sección de rutas autenticadas:
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

---

### Paso 15 — Tests

Crear al menos:
- `frontend/src/__tests__/InvoiceTable.spec.ts` — prueba de slots y emits
- `backend/src/invoices/repositories/invoice.repository.spec.ts` — test con DataSource stub

Para los tests de repositorio, seguir el patrón de `branch.repository.spec.ts`:

```ts
// Stub de DataSource que captura queries
function createDataSourceStub(rows: unknown[] = []) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  return {
    calls,
    dataSource: { query: async (sql: string, params: unknown[] = []) => { calls.push({ sql, params }); return rows; } },
  };
}
```

---

## Checklist rápida

Antes de abrir PR para un módulo nuevo, verificar:

- [ ] TypeCheck limpio: `npm run typecheck` (raíz)
- [ ] Tests verdes: `npm test` (raíz)
- [ ] Lint sin errores: `npm run lint` (raíz)
- [ ] Migración SQL numerada y aplicada en desarrollo
- [ ] Permisos en `packages/shared/permissions.ts` + migración de seeds
- [ ] Ruta con `requiredPermission` en el meta
- [ ] Store usa `usePaginatedSetup` (no duplicar boilerplate)
- [ ] View usa el componente feature (no inline slots de dominio)
- [ ] Test del feature component y del repositorio
