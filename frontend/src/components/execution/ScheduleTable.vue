<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Programación de obra"
    @retry="emit('retry')"
  >
    <template #cell-name="{ row }">
      <span class="strong" :title="row.name">{{ row.name }}</span>
    </template>
    <template #cell-start_date="{ row }">
      <span>{{ row.start_date ? formatDate(row.start_date) : '—' }}</span>
    </template>
    <template #cell-end_date="{ row }">
      <span>{{ row.end_date ? formatDate(row.end_date) : '—' }}</span>
    </template>
    <template #cell-progress_pct="{ row }">
      <div class="progress-cell">
        <span
          class="progress-track"
          role="progressbar"
          :aria-label="`Avance de ${row.name}`"
          :aria-valuenow="row.progress_pct"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="progress-fill" :style="{ width: `${row.progress_pct}%` }"></span>
        </span>
        <span class="progress-value">{{ row.progress_pct }}%</span>
      </div>
    </template>
    <template #cell-status="{ row }">
      <UiBadge
        :label="statusLabel(row.status)"
        :variant="statusVariant(row.status)"
        size="sm"
      />
    </template>
    <template #cell-notes="{ row }">
      <span class="muted">{{ row.notes || '—' }}</span>
    </template>
    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones de la actividad" :trigger-label="`Acciones para ${row.name}`">
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
      <IconTimeline :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconPencil, IconTimeline, IconTrash } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { ScheduleActivity, ScheduleStatus } from '@/types/execution';
import { formatDate } from '@/utils/date';

defineProps<{
  table: AppVueTable<AppFeatures, ScheduleActivity, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [activity: ScheduleActivity];
  delete: [activity: ScheduleActivity];
}>();

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  delayed: 'Retrasada',
};

const statusLabel = (status: ScheduleStatus) => STATUS_LABELS[status] ?? status;

const statusVariant = (status: ScheduleStatus): 'neutral' | 'info' | 'success' | 'danger' => {
  if (status === 'in_progress') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'delayed') return 'danger';
  return 'neutral';
};
</script>

<style scoped>
.strong {
  font-weight: 500;
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 120px;
}

.progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-hover);
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.progress-value {
  font-variant-numeric: tabular-nums;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
