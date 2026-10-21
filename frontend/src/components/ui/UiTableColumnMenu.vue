<template>
  <UiDropdown label="Columnas visibles" :min-width="220">
    <template #trigger="{ toggle, triggerAria }">
      <UiButton
        v-bind="triggerAria"
        variant="outline"
        size="sm"
        width="auto"
        @click="toggle"
      >
        <IconColumns3 :size="16" stroke-width="1.8" aria-hidden="true" />
        Columnas
      </UiButton>
    </template>

    <div class="column-menu">
      <button
        type="button"
        role="menuitem"
        class="column-item column-item--action"
        :disabled="allVisible"
        @click="showAll"
      >
        Mostrar todas
      </button>

      <div class="column-separator" role="separator"></div>

      <button
        v-for="column in columns"
        :key="column.id"
        type="button"
        role="menuitemcheckbox"
        class="column-item"
        :aria-checked="isVisible(column.column)"
        :disabled="!canHide(column.column)"
        @click="toggleColumn(column.column)"
      >
        <span class="column-check" aria-hidden="true">
          <IconCheck v-if="isVisible(column.column)" :size="14" stroke-width="2.4" />
        </span>
        <span>{{ column.label }}</span>
      </button>
    </div>
  </UiDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IconCheck, IconColumns3 } from '@tabler/icons-vue';
import UiButton from './UiButton.vue';
import UiDropdown from './UiDropdown.vue';

/**
 * Tipos estructurales (y no `Table` de TanStack) a propósito: la instancia
 * real trae un `TFeatures` muy concreto y `Table<any, any>` no es asignable
 * por invariancia. Solo usamos estas cuatro operaciones.
 */
interface ColumnLike {
  id: string;
  columnDef: { meta?: { label?: string } };
  getCanHide: () => boolean;
  getIsVisible: () => boolean;
  toggleVisibility: (value?: boolean) => void;
}

interface TableLike {
  getAllLeafColumns: () => ColumnLike[];
  getColumn: (columnId: string) => ColumnLike | undefined;
}

interface Props {
  table: TableLike;
}

const props = defineProps<Props>();

const columns = computed(() =>
  props.table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())
    .map((column) => ({
      id: column.id,
      label: column.columnDef.meta?.label || column.id,
      column,
    })),
);

const isVisible = (column: ColumnLike) => column.getIsVisible();

const visibleCount = computed(
  () => columns.value.filter((column) => isVisible(column.column)).length,
);

const allVisible = computed(() => visibleCount.value === columns.value.length);

const canHide = (column: ColumnLike) =>
  !isVisible(column) || visibleCount.value > 1;

const toggleColumn = (column: ColumnLike) => {
  if (!canHide(column)) return;
  column.toggleVisibility();
};

const showAll = () => {
  for (const { column } of columns.value) {
    if (!column.getIsVisible()) column.toggleVisibility(true);
  }
};
</script>

<style scoped>
.column-menu {
  display: flex;
  flex-direction: column;
}

.column-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.25rem;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.column-item:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-main);
}

.column-item:focus-visible {
  outline: 2px solid var(--text-main);
  outline-offset: -2px;
}

.column-item:disabled {
  cursor: default;
  opacity: 0.55;
}

.column-item--action {
  color: var(--text-main);
  font-weight: 500;
}

.column-separator {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--border);
}

.column-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  border: 1px solid var(--border-strong, var(--border));
  border-radius: calc(var(--radius) / 2);
  color: var(--text-main);
}

.column-item[aria-checked='true'] .column-check {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-on-primary, #fff);
}

@media (pointer: coarse) {
  .column-item {
    min-height: 44px;
  }
}
</style>
