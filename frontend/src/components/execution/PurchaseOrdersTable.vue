<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Órdenes de compra"
    @retry="emit('retry')"
  >
    <template #cell-code="{ row }">
      <span class="mono">{{ row.code }}</span>
    </template>
    <template #cell-supplier_name="{ row }">
      <span :class="{ muted: !row.supplier_name }">{{ row.supplier_name || '—' }}</span>
    </template>
    <template #cell-total="{ row }">
      <span class="num strong">{{ formatMoney(row.total, row.currency_code) }}</span>
    </template>
    <template #cell-status="{ row }">
      <UiBadge
        :label="statusLabel(row.status)"
        :variant="statusVariant(row.status)"
        size="sm"
      />
    </template>
    <template #cell-created_at="{ row }">
      <span>{{ formatDate(row.created_at) }}</span>
    </template>
    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones de la orden" :trigger-label="`Acciones para ${row.code}`">
        <UiDropdownItem @click="emit('open', row)">
          <IconEye :size="14" stroke-width="1.8" />
          <span>Ver detalle</span>
        </UiDropdownItem>
        <UiDropdownItem v-permission="Permissions.EXECUTION.DELETE" danger @click="emit('delete', row)">
          <IconTrash :size="14" stroke-width="1.8" />
          <span>Eliminar</span>
        </UiDropdownItem>
      </UiActionMenu>
    </template>

    <template #empty-icon>
      <IconShoppingCart :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconEye, IconShoppingCart, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/execution';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, PurchaseOrder, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  open: [order: PurchaseOrder];
  delete: [order: PurchaseOrder];
}>();

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

const statusLabel = (status: PurchaseOrderStatus) => STATUS_LABELS[status] ?? status;

const statusVariant = (
  status: PurchaseOrderStatus,
): 'neutral' | 'info' | 'success' | 'danger' => {
  if (status === 'sent') return 'info';
  if (status === 'received') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
};
</script>

<style scoped>
.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
}

.muted {
  color: var(--text-muted);
}

.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.strong {
  font-weight: 600;
}
</style>
