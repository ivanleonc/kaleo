<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Listado de APUs"
    @retry="emit('retry')"
  >
    <template #cell-code="{ row }">
      <span class="mono">{{ row.code }}</span>
    </template>

    <template #cell-name="{ row }">
      <div class="stack">
        <span class="strong truncate" :title="row.name">{{ row.name }}</span>
        <span v-if="row.description" class="muted truncate">{{ row.description }}</span>
      </div>
    </template>

    <template #cell-base_name="{ row }">
      <UiBadge :label="row.base_name" size="sm" />
    </template>

    <template #cell-lines_count="{ row }">
      <span class="count">{{ row.lines_count }}</span>
    </template>

    <template #cell-unit_cost="{ row }">
      <span class="money">{{ formatMoney(row.unit_cost) }}</span>
    </template>

    <template #cell-status="{ row }">
      <div class="status-cell">
        <UiBadge
          :label="row.current_version_status === 'approved' ? 'Aprobado' : 'Borrador'"
          :variant="row.current_version_status === 'approved' ? 'success' : 'warning'"
          size="sm"
        />
        <span class="muted">v{{ row.current_version_number ?? 1 }}</span>
      </div>
    </template>

    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones del APU" :trigger-label="`Acciones para ${row.name}`">
        <UiDropdownItem @click="emit('lines', row)">
          <IconListDetails :size="14" stroke-width="1.8" />
          <span>Insumos</span>
        </UiDropdownItem>
        <UiDropdownItem v-permission="Permissions.ESTIMATING.UPDATE" @click="emit('edit', row)">
          <IconPencil :size="14" stroke-width="1.8" />
          <span>Editar</span>
        </UiDropdownItem>
        <UiDropdownItem
          v-permission="Permissions.ESTIMATING.DELETE"
          danger
          @click="emit('delete', row)"
        >
          <IconTrash :size="14" stroke-width="1.8" />
          <span>Eliminar</span>
        </UiDropdownItem>
      </UiActionMenu>
    </template>

    <template #empty-icon>
      <IconRulerMeasure :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconListDetails, IconPencil, IconRulerMeasure, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { Apu } from '@/types/estimating';
import { formatMoney } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, Apu, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  lines: [apu: Apu];
  edit: [apu: Apu];
  delete: [apu: Apu];
}>();
</script>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.strong {
  font-weight: 500;
}

.mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.count {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.money {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
