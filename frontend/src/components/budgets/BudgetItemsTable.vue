<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    :row-class="rowClass"
    caption="Actividades del presupuesto"
    @retry="emit('retry')"
  >
    <template #cell-code="{ row }">
      <div class="code-cell" :style="{ paddingLeft: `${row.depth * 14}px` }">
        <button
          v-if="row.item_type === 'chapter' && row.has_children"
          type="button"
          class="expand-btn"
          :aria-label="expanded.has(row.id) ? 'Colapsar capítulo' : 'Expandir capítulo'"
          @click="emit('toggle', row.id)"
        >
          <IconChevronDown :size="15" :class="{ 'is-collapsed': !expanded.has(row.id) }" />
        </button>
        <span v-else class="expand-spacer" aria-hidden="true"></span>
        <span class="row-code">{{ row.code }}</span>
      </div>
    </template>

    <template #cell-name="{ row }">
      <span class="row-name" :class="{ 'is-chapter': row.item_type === 'chapter' }">
        {{ row.name }}
      </span>
    </template>

    <template #cell-quantity="{ row }">
      <input
        v-if="row.item_type === 'activity' && editable"
        v-model.number="row.quantity"
        type="number"
        class="grid-input"
        min="0"
        step="0.000001"
        aria-label="Cantidad"
        @change="emit('update-quantity', row.id, Number(row.quantity))"
      />
      <span v-else class="num">
        {{ row.item_type === 'activity' ? formatQuantity(row.quantity, 4) : '' }}
      </span>
    </template>

    <template #cell-unit_price="{ row }">
      <input
        v-if="row.item_type === 'activity' && editable && !row.apu_id"
        v-model.number="row.unit_price"
        type="number"
        class="grid-input"
        min="0"
        step="0.01"
        aria-label="Valor unitario"
        @change="emit('update-price', row.id, Number(row.unit_price))"
      />
      <span v-else class="num">
        {{ row.item_type === 'activity' ? formatMoney(row.unit_price, currency) : '' }}
      </span>
    </template>

    <template #cell-partial_amount="{ row }">
      <span class="num strong">{{ formatMoney(row.partial_amount, currency) }}</span>
    </template>

    <template #cell-assigned_user_name="{ row }">
      <span class="muted">{{ row.assigned_user_name || '—' }}</span>
    </template>

    <template #cell-actions="{ row }">
      <UiActionMenu label="Acciones de la actividad" :trigger-label="`Acciones para ${row.name}`">
        <UiDropdownItem v-if="row.apu_id" @click="emit('view-apu', row.apu_id)">
          <IconRulerMeasure :size="14" stroke-width="1.8" />
          <span>Ver APU</span>
        </UiDropdownItem>
        <UiDropdownItem v-if="editable" @click="emit('edit', row)">
          <IconPencil :size="14" stroke-width="1.8" />
          <span>Editar</span>
        </UiDropdownItem>
        <UiDropdownItem v-if="editable" danger @click="emit('delete', row)">
          <IconTrash :size="14" stroke-width="1.8" />
          <span>Eliminar</span>
        </UiDropdownItem>
      </UiActionMenu>
    </template>

    <template #empty-icon>
      <IconTable :size="48" stroke-width="1.5" />
    </template>
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import {
  IconChevronDown,
  IconPencil,
  IconRulerMeasure,
  IconTable,
  IconTrash,
} from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiActionMenu from '@/components/ui/UiActionMenu.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import type { AppFeatures } from '@/composables/useAppTable';
import type { BudgetTreeRow } from '@/types/budget';
import { formatMoney, formatQuantity } from '@/utils/money';

defineProps<{
  table: AppVueTable<AppFeatures, BudgetTreeRow, {}, {}, {}>;
  editable?: boolean;
  currency?: string;
  expanded: Set<string>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  toggle: [id: string];
  'view-apu': [apuId: string];
  edit: [row: BudgetTreeRow];
  delete: [row: BudgetTreeRow];
  'update-quantity': [id: string, value: number];
  'update-price': [id: string, value: number];
}>();

const rowClass = (row: BudgetTreeRow) =>
  row.item_type === 'chapter' ? 'is-chapter-row' : undefined;
</script>

<style scoped>
.code-cell {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.expand-btn,
.expand-spacer {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.expand-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.expand-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.expand-btn svg {
  transition: transform 0.15s;
}

.expand-btn svg.is-collapsed {
  transform: rotate(-90deg);
}

.row-code {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.row-name.is-chapter {
  font-weight: 600;
}

.num {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.strong {
  font-weight: 600;
}

.muted {
  color: var(--text-muted);
}

.grid-input {
  width: 100%;
  max-width: 130px;
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-app);
  color: var(--text-main);
  font: inherit;
  font-size: var(--text-xs);
  text-align: right;
}

.grid-input:focus {
  outline: 2px solid var(--primary);
  outline-offset: -1px;
}

:deep(tr.is-chapter-row) {
  background: var(--bg-hover);
}
</style>
