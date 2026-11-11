<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Movimientos de stock"
    @retry="emit('retry')"
  >
    <template #cell-occurred_at="{ row }">
      <span>{{ formatDate(row.occurred_at) }}</span>
    </template>
    <template #cell-resource_code="{ row }">
      <span class="mono">{{ row.resource_code }}</span>
    </template>
    <template #cell-resource_name="{ row }">
      <span class="strong" :title="row.resource_name">{{ row.resource_name }}</span>
    </template>
    <template #cell-movement_type="{ row }">
      <UiBadge
        :label="movementTypeLabel(row.movement_type)"
        :variant="movementVariant(row.movement_type)"
        size="sm"
      />
    </template>
    <template #cell-quantity="{ row }">
      <span class="num">{{ formatQuantity(row.quantity, 4) }} {{ row.unit_code }}</span>
    </template>
    <template #cell-unit_cost="{ row }">
      <span class="num">{{ formatMoney(row.unit_cost, currency) }}</span>
    </template>
    <template #cell-reference="{ row }">
      <span :class="{ muted: !row.reference }">{{ row.reference || '—' }}</span>
    </template>
    <template #cell-actions="{ row }">
      <UiButton
        v-permission="Permissions.EXECUTION.DELETE"
        size="sm"
        variant="ghost"
        width="auto"
        class="danger-action"
        @click="emit('delete', row)"
      >
        Eliminar
      </UiButton>
    </template>

    <template #empty-icon>
      <IconArrowsExchange :size="48" stroke-width="1.5" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconArrowsExchange } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { MovementType, StockMovement } from '@/types/execution';
import { formatDate } from '@/utils/date';
import { formatMoney, formatQuantity } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, StockMovement, {}, {}, {}>;
  currency?: string;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  delete: [movement: StockMovement];
}>();

const TYPE_LABELS: Record<MovementType, string> = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Ajuste',
};

const movementTypeLabel = (type: MovementType) => TYPE_LABELS[type] ?? type;

const movementVariant = (type: MovementType): 'success' | 'danger' | 'warning' => {
  if (type === 'in') return 'success';
  if (type === 'out') return 'danger';
  return 'warning';
};
</script>

<style scoped>
.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
}

.strong {
  font-weight: 500;
}

.muted {
  color: var(--text-muted);
}

.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
