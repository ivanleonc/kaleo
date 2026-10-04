# Crear un CRUD tabular

> **Cuándo usar este patrón:** Lista paginada con filtros, sort server-side, y operaciones crear/editar/eliminar en modales.
> **Referencias vivas:** `MembersView.vue`, `BranchesView.vue`, `branch.store.ts`

---

## Mapa de archivos a crear

```
Backend
  backend/src/migrations/0XX-add-invoices.sql
  backend/src/common/types/db-rows.ts          ← agregar InvoiceRow
  backend/src/invoices/
    repositories/invoice.repository.ts
    invoice.service.ts
    dto/create-invoice.dto.ts
    dto/update-invoice.dto.ts
    invoice.controller.ts
    invoice.module.ts
  backend/src/app.module.ts                    ← registrar InvoiceModule

packages/shared
  packages/shared/src/permissions.ts           ← agregar INVOICES.*

Frontend
  frontend/src/types/invoice.ts
  frontend/src/services/invoice.service.ts
  frontend/src/stores/invoice.store.ts
  frontend/src/composables/useInvoiceColumns.ts
  frontend/src/components/features/invoices/InvoiceTable.vue
  frontend/src/views/InvoicesView.vue
  frontend/src/router/index.ts                 ← agregar ruta
```

---

## Paso 1 — Migración SQL

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

Aplicar en el SQL Editor de Supabase.

---

## Paso 2 — Tipo de fila

```ts
// backend/src/common/types/db-rows.ts — agregar:
export interface InvoiceRow {
  id: string;
  company_id: string;
  number: string;
  status: string;
  amount: string; // Postgres NUMERIC → string en JS
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Paso 3 — Repository

```ts
// backend/src/invoices/repositories/invoice.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { rows, row } from '../../common/utils/db.js';
import { buildWhere, buildDynamicUpdate } from '../../common/utils/sql.helper.js';
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js';
import type { InvoiceRow } from '../../common/types/db-rows.js';

const SORT_COLUMNS: Record<string, string> = {
  number: 'number', status: 'status',
  amount: 'amount', due_date: 'due_date', created_at: 'created_at',
};

@Injectable()
export class InvoiceRepository {
  constructor(private dataSource: DataSource) {}

  async findPaged(companyId: string, page = 1, limit = 20, filters = {}, sort: SortSpec = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { where, values, nextIndex } = buildWhere([
      { clause: 'company_id = $?', value: companyId },
      { clause: 'deleted_at IS NULL' },
    ], 1);

    const orderBy = buildOrderBy(SORT_COLUMNS, sort, 'created_at');

    const [countResult, data] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as total FROM invoices WHERE ${where}`, values),
      rows<InvoiceRow>(await this.dataSource.query(
        `SELECT * FROM invoices WHERE ${where} ORDER BY ${orderBy}
         LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
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

  async create(companyId: string, data: { number: string; amount: number; due_date?: string }) {
    return row<InvoiceRow>(await this.dataSource.query(
      `INSERT INTO invoices (company_id, number, amount, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, data.number, data.amount, data.due_date ?? null],
    ));
  }

  async update(id: string, companyId: string, data: Partial<{ number: string; status: string; amount: number }>) {
    const { updates, values, startIndex } = buildDynamicUpdate(data, ['number', 'status', 'amount']);
    if (updates.length === 0) return this.findById(id, companyId);
    values.push(id, companyId);
    return row<InvoiceRow>(await this.dataSource.query(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${startIndex} AND company_id = $${startIndex + 1} RETURNING *`,
      values,
    ));
  }

  async softDelete(id: string, companyId: string) {
    await this.dataSource.query(
      `UPDATE invoices SET deleted_at = now() WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
  }
}
```

---

## Paso 4 — DTOs

```ts
// backend/src/invoices/dto/create-invoice.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsISO8601 } from 'class-validator';

export class CreateInvoiceDto {
  @IsString() @IsNotEmpty()
  number: string;

  @IsNumber() @Min(0)
  amount: number;

  @IsISO8601() @IsOptional()
  due_date?: string;
}
```

```ts
// backend/src/invoices/dto/update-invoice.dto.ts
import { IsString, IsNumber, Min, IsOptional, IsIn } from 'class-validator';

export class UpdateInvoiceDto {
  @IsString() @IsOptional()
  number?: string;

  @IsIn(['draft', 'sent', 'paid', 'overdue']) @IsOptional()
  status?: string;

  @IsNumber() @Min(0) @IsOptional()
  amount?: number;
}
```

---

## Paso 5 — Service

```ts
// backend/src/invoices/invoice.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from './repositories/invoice.repository.js';
import type { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import type { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Injectable()
export class InvoiceService {
  constructor(private invoiceRepo: InvoiceRepository) {}

  async list(companyId: string, query: PaginationQueryDto) {
    return this.invoiceRepo.findPaged(companyId, query.page, query.limit, {}, {
      sortBy: query.sortBy, sortDir: query.sortDir,
    });
  }

  async getOne(id: string, companyId: string) {
    const invoice = await this.invoiceRepo.findById(id, companyId);
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async create(companyId: string, dto: CreateInvoiceDto) {
    return this.invoiceRepo.create(companyId, dto);
  }

  async update(id: string, companyId: string, dto: UpdateInvoiceDto) {
    await this.getOne(id, companyId); // valida existencia
    return this.invoiceRepo.update(id, companyId, dto);
  }

  async remove(id: string, companyId: string) {
    await this.getOne(id, companyId);
    await this.invoiceRepo.softDelete(id, companyId);
  }
}
```

---

## Paso 6 — Controller

```ts
// backend/src/invoices/invoice.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { InvoiceService } from './invoice.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { RequirePermissions } from '../common/decorators/index.js';
import { Permissions } from '../common/constants/permissions.js';

@Controller('companies/invoices')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

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

  @Patch(':id')
  @RequirePermissions(Permissions.INVOICES.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @Headers('x-company-id') companyId: string) {
    return this.invoiceService.update(id, companyId, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.INVOICES.DELETE)
  remove(@Param('id') id: string, @Headers('x-company-id') companyId: string) {
    return this.invoiceService.remove(id, companyId);
  }
}
```

---

## Paso 7 — Module + registro

```ts
// backend/src/invoices/invoice.module.ts
import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller.js';
import { InvoiceService } from './invoice.service.js';
import { InvoiceRepository } from './repositories/invoice.repository.js';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
```

```ts
// backend/src/app.module.ts — en el array imports:
import { InvoiceModule } from './invoices/invoice.module.js';
// ...
@Module({ imports: [..., InvoiceModule] })
```

---

## Paso 8 — Permisos en shared

```ts
// packages/shared/src/permissions.ts — agregar:
export const Permissions = {
  // ... permisos existentes ...
  INVOICES: {
    READ:   'invoices:read',
    CREATE: 'invoices:create',
    UPDATE: 'invoices:update',
    DELETE: 'invoices:delete',
  },
} as const;
```

Agregar el INSERT en una nueva migración de seeds si la anterior ya está aplicada.

---

## Paso 9 — Types frontend

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
  updated_at: string;
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

## Paso 10 — Service frontend

```ts
// frontend/src/services/invoice.service.ts
import { apiClient } from '@/api/axios';
import type { InvoicesResponse } from '@/types/invoice';

export const invoiceService = {
  async getInvoices(params?: {
    page?: number; limit?: number;
    sortBy?: string; sortDir?: 'asc' | 'desc';
  }): Promise<InvoicesResponse> {
    const res = await apiClient.get<InvoicesResponse>('/companies/invoices', { params });
    return res.data;
  },

  async createInvoice(payload: { number: string; amount: number; due_date?: string }) {
    const res = await apiClient.post('/companies/invoices', payload);
    return res.data;
  },

  async updateInvoice(id: string, payload: Partial<{ number: string; status: string; amount: number }>) {
    const res = await apiClient.patch(`/companies/invoices/${id}`, payload);
    return res.data;
  },

  async deleteInvoice(id: string) {
    const res = await apiClient.delete(`/companies/invoices/${id}`);
    return res.data;
  },
};
```

---

## Paso 11 — Store (plantilla de branch.store.ts)

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

  // Alias para mantener el patrón consistente con otros módulos
  const invoices = paginated.items;
  const fetchInvoices = (targetPage?: number) => paginated.fetch(targetPage);

  const createInvoice = async (payload: { number: string; amount: number }) => {
    const result = await paginated.withLoading(async () => {
      const res = await invoiceService.createInvoice(payload);
      await paginated.refresh();
      return res.data;
    }, 'Error al crear la factura');
    return result;
  };

  const updateInvoice = async (id: string, payload: Partial<{ number: string; status: string }>) => {
    await paginated.withLoading(async () => {
      await invoiceService.updateInvoice(id, payload);
      await paginated.refresh();
    }, 'Error al actualizar la factura');
  };

  const deleteInvoice = async (id: string) => {
    await paginated.withLoading(async () => {
      await invoiceService.deleteInvoice(id);
      await paginated.refresh();
    }, 'Error al eliminar la factura');
  };

  return {
    ...paginated,
    invoices,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
});
```

---

## Paso 12 — Columnas de tabla

```ts
// frontend/src/composables/useInvoiceColumns.ts
import { createAppColumnHelper } from '@/composables/useAppTable';
import type { Invoice } from '@/types/invoice';

const helper = createAppColumnHelper<Invoice>();

export function useInvoiceColumns() {
  return [
    helper.accessor('number', {
      header: 'Número',
      meta: { label: 'Número' },
    }),
    helper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado' },
    }),
    helper.accessor('amount', {
      header: 'Monto',
      meta: { label: 'Monto', align: 'right' },
    }),
    helper.accessor('due_date', {
      header: 'Vencimiento',
      meta: { label: 'Vencimiento' },
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones' },
    }),
  ];
}
```

---

## Paso 13 — Feature component (tabla)

```vue
<!-- frontend/src/components/features/invoices/InvoiceTable.vue -->
<template>
  <UiDataTable
    :table="table" :loading="loading" :error="error"
    :error-title="errorTitle" :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    @retry="emit('retry')"
  >
    <template #cell-status="{ row }">
      <UiBadge :variant="statusVariant(row.status)" size="sm">
        {{ statusLabel(row.status) }}
      </UiBadge>
    </template>
    <template #cell-amount="{ row }">
      <span class="font-mono">$ {{ Number(row.amount).toLocaleString() }}</span>
    </template>
    <template #cell-actions="{ row }">
      <!-- Dropdown de acciones: igual que MemberTable / BranchTable -->
    </template>
    <template #empty-icon><IconReceipt :size="48" stroke-width="1.5" /></template>
    <template #empty-action><slot name="empty-action" /></template>
  </UiDataTable>
</template>
```

---

## Paso 14 — View

```vue
<!-- frontend/src/views/InvoicesView.vue — estructura estándar -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useInvoiceStore } from '@/stores/invoice.store';
import { useInvoiceColumns } from '@/composables/useInvoiceColumns';
import { useTableView } from '@/composables/useTableView';
import { useFilterSync } from '@/composables/useFilterSync';
import { useModal } from '@/composables/useModal';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useCreateAction } from '@/composables/useCreateAction';
import { useCompanyPath } from '@/composables/useCompanyPath';

const invoiceStore = useInvoiceStore();
const { companyId } = useCompanyPath();

// Tabla con sort conectado en 1 línea
const { table, isInitialLoading } = useTableView(useInvoiceColumns(), invoiceStore);

// Filtros
const filterValues = ref({ search: '', status: '' });
watch(companyId, () => { filterValues.value = { search: '', status: '' }; });
useFilterSync(filterValues, (v) => invoiceStore.applyFilters({
  search: v.search || undefined,
  status: v.status || undefined,
}));

// Modales
const createModal = useModal();
const editModal = useModal<Invoice>();
const deleteModal = useModal<{ id: string; number: string }>();

// Formulario de crear/editar
const form = reactive({ number: '', amount: 0 });
const { isDirty, capture } = useDirtyForm(() => ({ ...form }));

onMounted(() => invoiceStore.fetchInvoices());
useCreateAction(() => openCreateModal());
</script>
```

---

## Paso 15 — Ruta

```ts
// frontend/src/router/index.ts — en el bloque de rutas autenticadas:
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

## Checklist pre-PR

- [ ] `npm run typecheck` limpio (raíz)
- [ ] `npm test` verde (raíz)
- [ ] Migración SQL aplicada en development
- [ ] Permisos en `packages/shared` + seed SQL
- [ ] Ruta con `requiredPermission`
- [ ] Store usa `usePaginatedSetup`
- [ ] View usa `useTableView` + `useFilterSync` + `useModal`
- [ ] Feature component separado de la view
- [ ] Test del feature component y del repository

