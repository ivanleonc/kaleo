<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Contratos del proyecto"
    @retry="emit('retry')"
  >
    <template #cell-code="{ row }">
      <span class="mono">{{ row.code }}</span>
    </template>
    <template #cell-name="{ row }">
      <span class="strong" :title="row.name">{{ row.name }}</span>
    </template>
    <template #cell-party_name="{ row }">
      <span :class="{ muted: !row.party_name }">{{ row.party_name || '—' }}</span>
    </template>
    <template #cell-contract_type="{ row }">
      <UiBadge :label="contractTypeLabel(row.contract_type)" size="sm" />
    </template>
    <template #cell-amount="{ row }">
      <span class="num">{{ formatMoney(row.amount, row.currency_code) }}</span>
    </template>
    <template #cell-start_date="{ row }">
      <span>{{ row.start_date ? formatDate(row.start_date) : '—' }}</span>
    </template>
    <template #cell-end_date="{ row }">
      <span>{{ row.end_date ? formatDate(row.end_date) : '—' }}</span>
    </template>
    <template #cell-status="{ row }">
      <UiBadge
        :label="statusLabel(row.status)"
        :variant="statusVariant(row.status)"
        size="sm"
      />
    </template>
    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones del contrato" :trigger-label="`Acciones para ${row.name}`">
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
      <IconClipboardList :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconClipboardList, IconPencil, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { Contract, ContractStatus, ContractType } from '@/types/execution';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, Contract, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [contract: Contract];
  delete: [contract: Contract];
}>();

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  obra: 'Obra',
  subcontrato: 'Subcontrato',
  servicio: 'Servicio',
  suministro: 'Suministro',
  otro: 'Otro',
};

const contractTypeLabel = (type: ContractType) => CONTRACT_TYPE_LABELS[type] ?? type;

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  completed: 'Completado',
  terminated: 'Terminado',
};

const statusLabel = (status: ContractStatus) => STATUS_LABELS[status] ?? status;

const statusVariant = (
  status: ContractStatus,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'active') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'terminated') return 'danger';
  return 'neutral';
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
  font-weight: 500;
}
</style>
