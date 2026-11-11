<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    :row-class="rowClass"
    :on-row-click="(row) => emit('select', row)"
    caption="Almacenes del proyecto"
    @retry="emit('retry')"
  >
    <template #cell-code="{ row }">
      <span class="mono">{{ row.code }}</span>
    </template>
    <template #cell-name="{ row }">
      <span class="strong" :title="row.name">{{ row.name }}</span>
    </template>
    <template #cell-location="{ row }">
      <span :class="{ muted: !row.location }">{{ row.location || '—' }}</span>
    </template>
    <template #cell-status="{ row }">
      <UiBadge
        :label="row.is_active ? 'Activo' : 'Inactivo'"
        :variant="row.is_active ? 'success' : 'warning'"
        size="sm"
      />
    </template>
    <template #cell-actions="{ row }">
      <div class="actions-cell" @click.stop>
        <UiActionMenu label="Acciones del almacén" :trigger-label="`Acciones para ${row.name}`">
          <UiDropdownItem v-permission="Permissions.EXECUTION.UPDATE" @click="emit('edit', row)">
            <IconPencil :size="14" stroke-width="1.8" />
            <span>Editar</span>
          </UiDropdownItem>
          <UiDropdownItem v-permission="Permissions.EXECUTION.DELETE" danger @click="emit('delete', row)">
            <IconTrash :size="14" stroke-width="1.8" />
            <span>Eliminar</span>
          </UiDropdownItem>
        </UiActionMenu>
      </div>
    </template>

    <template #empty-icon>
      <IconBuildingWarehouse :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconBuildingWarehouse, IconPencil, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { Warehouse } from '@/types/execution';

const props = defineProps<{
  table: AppVueTable<AppFeatures, Warehouse, {}, {}, {}>;
  selectedId?: string;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  select: [warehouse: Warehouse];
  edit: [warehouse: Warehouse];
  delete: [warehouse: Warehouse];
}>();

const rowClass = (warehouse: Warehouse) =>
  warehouse.id === props.selectedId ? 'is-selected-row' : undefined;
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

.actions-cell {
  display: flex;
  justify-content: flex-end;
}
</style>
