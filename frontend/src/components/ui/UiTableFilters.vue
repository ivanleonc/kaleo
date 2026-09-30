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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IconX } from '@tabler/icons-vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';

export type TableFilterType = 'search' | 'select' | 'date';

export interface TableFilterOption {
  label: string;
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
  /** Ocupa el espacio restante (normalmente el buscador). */
  grow?: boolean;
  /** Límites para `type: 'date'`. */
  min?: string;
  max?: string;
}

defineProps<{
  filters: TableFilterDef[];
}>();

/** Valores por clave. Convención: `''` = filtro inactivo. */
const values = defineModel<Record<string, string>>({ required: true });

const valueOf = (key: string): string => values.value[key] ?? '';

const update = (key: string, value: string) => {
  values.value = { ...values.value, [key]: value };
};

const hasActiveFilters = computed(() =>
  Object.values(values.value).some((v) => v !== ''),
);

const clearAll = () => {
  values.value = Object.fromEntries(
    Object.keys(values.value).map((key) => [key, '']),
  );
};
</script>
