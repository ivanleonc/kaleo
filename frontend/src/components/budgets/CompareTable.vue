<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    :row-class="rowClass"
    caption="Comparación de versiones del presupuesto"
  >
    <template #cell-base_quantity="{ row }">
      <span class="num">{{ row.base_quantity ?? '—' }}</span>
    </template>
    <template #cell-target_quantity="{ row }">
      <span class="num">{{ row.target_quantity ?? '—' }}</span>
    </template>
    <template #cell-base_partial="{ row }">
      <span class="num">{{ row.base_partial === null ? '—' : formatMoney(row.base_partial, currency) }}</span>
    </template>
    <template #cell-target_partial="{ row }">
      <span class="num">{{ row.target_partial === null ? '—' : formatMoney(row.target_partial, currency) }}</span>
    </template>
    <template #cell-delta="{ row }">
      <span class="num strong">{{ formatMoney(row.delta, currency) }}</span>
    </template>
    <template #cell-change="{ row }">
      <UiBadge :label="changeLabel(row.change)" :variant="changeVariant(row.change)" size="sm" />
    </template>

    <template #empty-icon>
      <IconGitCompare :size="48" stroke-width="1.5" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconGitCompare } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { CompareChange, CompareDiffRow } from '@/types/budget';
import { formatMoney } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, CompareDiffRow, {}, {}, {}>;
  currency: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const rowClass = (row: CompareDiffRow) => `is-${row.change}-row`;

const CHANGE_LABELS: Record<CompareChange, string> = {
  added: 'Agregada',
  removed: 'Eliminada',
  modified: 'Modificada',
  unchanged: 'Sin cambio',
};

const changeLabel = (change: CompareChange) => CHANGE_LABELS[change] ?? change;

const changeVariant = (change: CompareChange): 'success' | 'danger' | 'warning' | 'neutral' => {
  if (change === 'added') return 'success';
  if (change === 'removed') return 'danger';
  if (change === 'modified') return 'warning';
  return 'neutral';
};
</script>

<style scoped>
.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.strong {
  font-weight: 600;
}

:deep(tr.is-modified-row) {
  background: var(--bg-hover);
}

:deep(tr.is-added-row) {
  background: var(--accent-green-bg, var(--bg-hover));
}

:deep(tr.is-removed-row) {
  background: var(--accent-red-bg, var(--bg-hover));
}
</style>
