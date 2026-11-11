<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Listado consolidado de insumos"
    @retry="emit('retry')"
  >
    <template #cell-resource_code="{ row }">
      <span class="mono">{{ row.resource_code }}</span>
    </template>

    <template #cell-component_type="{ row }">
      <UiBadge :label="componentTypeLabel(row.component_type)" size="sm" />
    </template>

    <template #cell-quantity="{ row }">
      <span class="num">{{ formatQuantity(row.quantity, 4) }}</span>
    </template>

    <template #cell-unit_cost="{ row }">
      <span class="num">{{ formatMoney(row.unit_cost, row.currency_code) }}</span>
    </template>

    <template #cell-total_cost="{ row }">
      <span class="num strong">{{ formatMoney(row.total_cost, row.currency_code) }}</span>
    </template>

    <template #empty-icon>
      <IconStack2 :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconStack2 } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { MaterialRow } from '@/types/budget';
import { formatMoney, formatQuantity } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, MaterialRow, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{ retry: [] }>();

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Mano de obra',
  equipment: 'Equipo',
  transport: 'Transporte',
  subcontract: 'Subcontrato',
};

const componentTypeLabel = (type: string) => COMPONENT_TYPE_LABELS[type] ?? type;
</script>

<style scoped>
.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
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
