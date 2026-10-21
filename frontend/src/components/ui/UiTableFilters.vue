<template>
  <div v-if="filters.length > 0" class="filters-bar">
    <div
      v-for="def in filters"
      :key="def.key"
      class="filter-group"
      :class="{ 'filter-group-grow': def.grow }"
    >
      <!--
        Escape hatch para filtros especiales por cliente (rangos de fecha,
        multiselects…): `#filter-{key}` recibe el valor, todos los valores
        y un `update`. Si no hay slot, se renderiza el control estándar.
      -->
      <slot
        :name="`filter-${def.key}`"
        :def="def"
        :value="valueOf(def.key)"
        :values="values"
        :update="(k: string, v: string) => update(k, v)"
      >
        <UiSearchInput
          v-if="def.type === 'search'"
          :model-value="valueOf(def.key)"
          :placeholder="def.placeholder ?? 'Buscar...'"
          :aria-label="def.label"
          @update:model-value="update(def.key, $event)"
        />
        <UiSelect
          v-else-if="def.type === 'select'"
          :model-value="valueOf(def.key)"
          :options="def.options ?? []"
          :placeholder="def.placeholder ?? ''"
          :searchable="def.searchable ?? 'auto'"
          size="sm"
          :clearable="false"
          :aria-label="def.label"
          @update:model-value="update(def.key, String($event ?? ''))"
        />
        <input
          v-else-if="def.type === 'date'"
          type="date"
          class="filter-input"
          :aria-label="def.label"
          :value="valueOf(def.key)"
          :min="def.min"
          :max="def.max"
          @input="update(def.key, ($event.target as HTMLInputElement).value)"
        />
      </slot>
    </div>
    <button
      v-if="hasActiveFilters"
      type="button"
      class="clear-btn"
      @click="clearAll"
    >
      <IconX :size="14" /> Limpiar
    </button>

    <div
      v-if="showActiveFilters && activeChips.length > 0"
      class="active-filters"
      aria-label="Filtros activos"
    >
      <span class="active-filters-label">Filtros activos</span>
      <button
        v-for="chip in activeChips"
        :key="chip.key"
        type="button"
        class="filter-chip"
        @click="removeFilter(chip.key)"
      >
        <span class="filter-chip-text" :title="chip.label">{{ chip.label }}</span>
        <IconX :size="12" stroke-width="2" aria-hidden="true" />
        <span class="sr-only">{{ chip.removeLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IconX } from '@tabler/icons-vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import type { UiSelectOption } from '@/types/ui';

export type TableFilterType = 'search' | 'select' | 'date';

export interface TableFilterOption extends Omit<UiSelectOption, 'value'> {
  value: string;
}

export interface TableFilterDef {
  /** Clave en el objeto del v-model (`search`, `status`, `from`…). */
  key: string;
  type: TableFilterType;
  /** Etiqueta accesible (aria-label) del control. */
  label: string;
  /** Placeholder del buscador o del select. */
  placeholder?: string;
  /** Opciones del select. */
  options?: TableFilterOption[];
  searchable?: boolean | 'auto';
  /** Ocupa el espacio restante (normalmente el buscador). */
  grow?: boolean;
  /** Límites para `type: 'date'`. */
  min?: string;
  max?: string;
  /** Personaliza el texto visible del chip (por defecto usa la etiqueta del select). */
  format?: (value: string) => string;
}

const props = withDefaults(defineProps<{
  filters: TableFilterDef[];
  showActiveFilters?: boolean;
}>(), {
  showActiveFilters: true,
});

/** Valores por clave. Convención: `''` = filtro inactivo. */
const values = defineModel<Record<string, string>>({ required: true });

const valueOf = (key: string): string => values.value[key] ?? '';

const update = (key: string, value: string) => {
  values.value = { ...values.value, [key]: value };
};

function isActiveValue(value: string, type: TableFilterType): boolean {
  return type === 'search' ? value.trim() !== '' : value !== '';
}

const hasActiveFilters = computed(() =>
  props.filters.some((def) => isActiveValue(valueOf(def.key), def.type)),
);

const activeChips = computed(() =>
  props.filters.flatMap((def) => {
    const value = valueOf(def.key);
    if (!isActiveValue(value, def.type)) return [];

    let label = value;
    if (def.type === 'search') {
      label = `"${value.trim()}"`;
    } else if (def.type === 'select') {
      label = def.options?.find((option) => option.value === value)?.label ?? value;
    }
    if (def.format) label = def.format(value);

    return [{
      key: def.key,
      label,
      removeLabel: def.type === 'search'
        ? 'Quitar búsqueda'
        : `Quitar filtro ${def.label.toLowerCase()}`,
    }];
  }),
);

const removeFilter = (key: string) => {
  update(key, '');
};

const clearAll = () => {
  values.value = Object.fromEntries(
    Object.keys(values.value).map((key) => [key, '']),
  );
};
</script>

<style scoped>
.active-filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1 0 100%;
  flex-wrap: wrap;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.active-filters-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: min(100%, 28rem);
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: var(--bg-card);
  color: var(--text-main);
  font-size: var(--text-xs);
  cursor: pointer;
}

.filter-chip:hover {
  border-color: var(--text-light);
  background-color: var(--bg-hover);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.filter-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .filter-chip {
    min-height: 44px;
  }
}
</style>
