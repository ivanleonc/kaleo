<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    :row-class="rowClass"
    caption="Versiones del presupuesto"
    @retry="emit('retry')"
  >
    <template #cell-version="{ row }">
      <span class="version">v{{ row.version }}</span>
    </template>

    <template #cell-label="{ row }">
      <span :class="{ muted: !row.label }">{{ row.label || '—' }}</span>
    </template>

    <template #cell-status="{ row }">
      <UiBadge
        :label="statusLabel(row.status)"
        :variant="statusVariant(row.status)"
        size="sm"
      />
    </template>

    <template #cell-subtotal="{ row }">
      <span class="num">{{ formatMoney(row.subtotal, currency) }}</span>
    </template>

    <template #cell-total="{ row }">
      <span class="num strong">{{ formatMoney(row.total, currency) }}</span>
    </template>

    <template #cell-actions="{ row }">
      <UiButton
        size="sm"
        variant="ghost"
        width="auto"
        :disabled="row.id === currentId"
        @click="emit('open', row.id)"
      >
        {{ row.id === currentId ? 'Actual' : 'Abrir' }}
      </UiButton>
    </template>

    <template #empty-icon>
      <IconHistory :size="48" stroke-width="1.5" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconHistory } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { BudgetStatus, BudgetVersionSummary } from '@/types/budget';
import { formatMoney } from '@/utils/money';

const props = defineProps<{
  table: AppVueTable<AppFeatures, BudgetVersionSummary, {}, {}, {}>;
  currentId: string;
  currency: string;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  open: [id: string];
}>();

const rowClass = (version: BudgetVersionSummary) =>
  version.id === props.currentId ? 'is-current-row' : undefined;

const STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  superseded: 'Reemplazado',
};

const statusLabel = (status: BudgetStatus) => STATUS_LABELS[status] ?? status;

const statusVariant = (status: BudgetStatus): 'success' | 'warning' | 'neutral' | 'info' => {
  if (status === 'approved') return 'success';
  if (status === 'in_review') return 'info';
  if (status === 'draft') return 'warning';
  return 'neutral';
};
</script>

<style scoped>
.version {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
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

:deep(tr.is-current-row) {
  background: var(--bg-hover);
}
</style>
