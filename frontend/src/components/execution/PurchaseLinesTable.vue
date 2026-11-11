<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    empty-title="La orden no tiene líneas"
    empty-description="Agrega insumos o descripciones a la orden de compra."
    caption="Líneas de la orden de compra"
  >
    <template #cell-resource_code="{ row }">
      <span class="mono">{{ row.resource_code || '—' }}</span>
    </template>
    <template #cell-description="{ row }">
      <span class="strong" :title="row.description">{{ row.description }}</span>
    </template>
    <template #cell-quantity="{ row }">
      <span class="num">{{ formatQuantity(row.quantity, 4) }}</span>
    </template>
    <template #cell-unit_price="{ row }">
      <span class="num">{{ formatMoney(row.unit_price, currency) }}</span>
    </template>
    <template #cell-amount="{ row }">
      <span class="num strong">{{ formatMoney(row.amount, currency) }}</span>
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { PurchaseOrderLine } from '@/types/execution';
import { formatMoney, formatQuantity } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, PurchaseOrderLine, {}, {}, {}>;
  currency: string;
  loading?: boolean;
}>();
</script>

<style scoped>
.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
}

.strong {
  font-weight: 500;
}

.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
