<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Líneas de la hoja de takeoff"
    @retry="emit('retry')"
  >
    <template #cell-quantity="{ row }">
      <span class="num strong">{{ formatQuantity(row.quantity, 6) }} {{ row.unit_code }}</span>
    </template>

    <template #cell-notes="{ row }">
      <span class="muted">{{ row.notes || '—' }}</span>
    </template>

    <template #cell-actions="{ row }">
      <div class="row-actions">
        <UiButton v-if="editable" size="sm" variant="ghost" width="auto" @click="emit('edit', row)">
          Editar
        </UiButton>
        <UiButton
          v-if="editable"
          size="sm"
          variant="ghost"
          width="auto"
          class="danger-action"
          @click="emit('delete', row)"
        >
          Quitar
        </UiButton>
      </div>
    </template>

    <template #empty-icon>
      <IconRulerMeasure :size="48" stroke-width="1.5" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import { IconRulerMeasure } from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiButton from '@/components/ui/UiButton.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { TakeoffLine } from '@/types/budget';
import { formatQuantity } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, TakeoffLine, {}, {}, {}>;
  editable?: boolean;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [line: TakeoffLine];
  delete: [line: TakeoffLine];
}>();
</script>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.strong {
  font-weight: 600;
}

.muted {
  color: var(--text-muted);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}
</style>
