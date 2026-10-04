# Vista de detalle

> **Cuándo usar este patrón:** Pantalla que muestra toda la información de un único registro con posibilidad de editar y ver sub-entidades relacionadas.
> **Ejemplo:** `InvoiceDetailView.vue` — muestra una factura con sus líneas, notas e historial.

---

## Estructura típica de una vista de detalle

```
┌─ UiPageHeader (título + breadcrumb + acciones) ─────────────┐
│  [← Facturas]  Factura #INV-001              [Editar] [PDF] │
└─────────────────────────────────────────────────────────────┘

┌─ UiCard (datos principales) ────────────────────────────────┐
│  UiDetailGrid                                               │
│    UiInfoRow "Número"      INV-001                          │
│    UiInfoRow "Estado"      <UiBadge>Pagada</UiBadge>        │
│    UiInfoRow "Monto"       $ 1.500.000                      │
│    UiInfoRow "Vencimiento" 15/03/2026                       │
└─────────────────────────────────────────────────────────────┘

┌─ UiCard (sub-entidad: líneas de factura) ───────────────────┐
│  <InvoiceLinesTable> (tabla embebida, sin paginación)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Patrón de carga con `useAsyncData`

```ts
// frontend/src/views/InvoiceDetailView.vue
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData';
import { useModal } from '@/composables/useModal';
import { useDirtyForm } from '@/composables/useDirtyForm';

const route = useRoute();
const invoiceId = computed(() => route.params.id as string);

// Carga el registro principal — recarga cuando cambia el ID en la URL
const { data: invoice, isLoading, error, reload } = useAsyncData(
  () => invoiceService.getOne(invoiceId.value),
  { watch: invoiceId, errorMessage: 'No pudimos cargar la factura' }
);
```

---

## Template estándar

```vue
<template>
  <AuthenticatedLayout>
    <!-- Skeleton de carga -->
    <template v-if="isLoading">
      <UiCard>
        <template #header>
          <UiSkeleton variant="title" width="200px" />
        </template>
        <UiDetailGrid>
          <div v-for="n in 4" :key="n" class="info-row-skeleton">
            <UiSkeleton variant="text" width="120px" />
            <UiSkeleton variant="text" width="180px" />
          </div>
        </UiDetailGrid>
      </UiCard>
    </template>

    <UiErrorState
      v-else-if="error"
      :description="error"
      @retry="reload"
    />

    <template v-else-if="invoice">
      <!-- UiPageHeader con acciones -->
      <UiPageHeader :title="`Factura #${invoice.number}`">
        <template #actions>
          <UiButton v-permission="Permissions.INVOICES.UPDATE" @click="editModal.open(invoice)" width="auto">
            <IconEdit :size="16" /> Editar
          </UiButton>
        </template>
      </UiPageHeader>

      <!-- Datos principales -->
      <UiCard>
        <UiDetailGrid>
          <UiInfoRow label="Número">{{ invoice.number }}</UiInfoRow>
          <UiInfoRow label="Estado">
            <UiBadge :variant="statusVariant(invoice.status)" size="sm">
              {{ statusLabel(invoice.status) }}
            </UiBadge>
          </UiInfoRow>
          <UiInfoRow label="Monto">$ {{ Number(invoice.amount).toLocaleString() }}</UiInfoRow>
          <UiInfoRow label="Vencimiento">{{ invoice.due_date ?? 'Sin vencimiento' }}</UiInfoRow>
        </UiDetailGrid>
      </UiCard>

      <!-- Sub-entidad: líneas -->
      <UiCard>
        <template #header>
          <div class="card-header-row">
            <h3 class="card-title">Líneas de Factura</h3>
          </div>
        </template>
        <InvoiceLinesTable :invoice-id="invoice.id" />
      </UiCard>
    </template>

    <!-- Modal de edición -->
    <UiFormModal
      v-model="isEditModalOpen"
      title="Editar Factura"
      submit-label="Guardar Cambios"
      :loading="isSaving"
      :dirty="isDirty"
      :confirm-on-dirty="true"
      @submit="handleEdit"
    >
      <!-- formulario -->
    </UiFormModal>
  </AuthenticatedLayout>
</template>
```

---

## Ruta con parámetro de ID

```ts
// frontend/src/router/index.ts
{
  path: '/companies/:companyId/invoices/:id',
  component: () => import('@/views/InvoiceDetailView.vue'),
  meta: {
    requiresAuth: true,
    requiredPermission: Permissions.INVOICES.READ,
    title: 'Detalle de Factura',
  },
},
```

---

## Navegación a la vista de detalle

```ts
// Desde InvoicesView al hacer clic en una fila:
const { companyPath } = useCompanyPath();

// En el feature component InvoiceTable.vue:
const emit = defineEmits<{ view: [invoice: Invoice] }>();

// En InvoicesView.vue:
function openDetail(invoice: Invoice) {
  router.push(companyPath(`/invoices/${invoice.id}`));
}
```

---

## `UiDetailGrid` + `UiInfoRow` — API

```html
<!-- Uso básico -->
<UiDetailGrid>
  <UiInfoRow label="Nombre">{{ entity.name }}</UiInfoRow>
  <UiInfoRow label="Estado">
    <UiBadge variant="success">Activo</UiBadge>
  </UiInfoRow>
</UiDetailGrid>
```

| Componente | Props | Slot default |
|---|---|---|
| `UiDetailGrid` | ninguna | `UiInfoRow`s |
| `UiInfoRow` | `label: string` | valor (texto, badge, avatar...) |

---

## Checklist pre-PR

- [ ] `useAsyncData` con `watch: invoiceId` — recarga cuando cambia el ID
- [ ] Skeleton durante la carga (no flash de contenido vacío)
- [ ] `UiErrorState` con `@retry="reload"`
- [ ] Los datos de la vista de detalle no polutan el store paginado del listado
- [ ] La sub-entidad tiene su propio componente feature (no inline en la view)

