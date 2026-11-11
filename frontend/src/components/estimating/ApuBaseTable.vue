<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Listado de bases de APUs"
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

    <template #cell-source="{ row }">
      <UiBadge v-if="row.source" :label="row.source" size="sm" />
      <span v-else class="muted">Sin fuente</span>
    </template>

    <template #cell-apus_count="{ row }">
      <span class="count">{{ row.apus_count }}</span>
    </template>

    <template #cell-status="{ row }">
      <UiBadge
        :label="row.is_active ? 'Activa' : 'Inactiva'"
        :variant="row.is_active ? 'success' : 'warning'"
        size="sm"
      />
    </template>

    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones de la base" :trigger-label="`Acciones para ${row.name}`">
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
      <IconStack2 :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconPencil, IconStack2, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { ApuBase } from '@/types/estimating';

defineProps<{
  table: AppVueTable<AppFeatures, ApuBase, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [base: ApuBase];
  delete: [base: ApuBase];
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

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
