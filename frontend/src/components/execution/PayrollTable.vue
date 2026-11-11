<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Registros de nómina"
    @retry="emit('retry')"
  >
    <template #cell-worker_name="{ row }">
      <span class="strong" :title="row.worker_name">{{ row.worker_name }}</span>
    </template>
    <template #cell-period_start="{ row }">
      <span>{{ formatDate(row.period_start) }}</span>
    </template>
    <template #cell-period_end="{ row }">
      <span>{{ formatDate(row.period_end) }}</span>
    </template>
    <template #cell-days="{ row }">
      <span class="num">{{ row.days }}</span>
    </template>
    <template #cell-amount="{ row }">
      <span class="num strong">{{ formatMoney(row.amount, row.currency_code) }}</span>
    </template>
    <template #cell-status="{ row }">
      <UiBadge
        :label="statusLabel(row.status)"
        :variant="statusVariant(row.status)"
        size="sm"
      />
    </template>
    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones del registro" :trigger-label="`Acciones para ${row.worker_name}`">
        <UiDropdownItem v-permission="Permissions.EXECUTION.UPDATE" @click="emit('edit', row)">
          <IconPencil :size="14" stroke-width="1.8" />
          <span>Editar</span>
        </UiDropdownItem>
        <UiDropdownItem v-permission="Permissions.EXECUTION.DELETE" danger @click="emit('delete', row)">
          <IconTrash :size="14" stroke-width="1.8" />
          <span>Eliminar</span>
        </UiDropdownItem>
      </UiActionMenu>
    </template>

    <template #empty-icon>
      <IconUsers :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconPencil, IconTrash, IconUsers } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { PayrollEntry, PayrollStatus } from '@/types/execution';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, PayrollEntry, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [entry: PayrollEntry];
  delete: [entry: PayrollEntry];
}>();

const STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Borrador',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

const statusLabel = (status: PayrollStatus) => STATUS_LABELS[status] ?? status;

const statusVariant = (status: PayrollStatus): 'neutral' | 'success' | 'danger' => {
  if (status === 'paid') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
};
</script>

<style scoped>
.strong {
  font-weight: 500;
}

.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
