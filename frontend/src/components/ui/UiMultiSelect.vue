<template>
  <UiSelectBase
    :model-value="model"
    :label="label"
    :placeholder="placeholder"
    :options="options"
    :searchable="searchable"
    :search-placeholder="searchPlaceholder"
    :empty-text="emptyText"
    :no-results-text="noResultsText"
    :size="size"
    :clearable="clearable"
    :required="required"
    :disabled="disabled"
    :error="error"
    :aria-label="ariaLabel"
    :multiple="true"
    :max-tags="maxTags"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import UiSelectBase from '@/components/ui/UiSelectBase.vue';
import type { UiSelectOption, UiSelectValue } from '@/types/ui';

interface Props {
  label?: string;
  placeholder?: string;
  options: UiSelectOption[];
  searchable?: boolean | 'auto';
  searchPlaceholder?: string;
  emptyText?: string;
  noResultsText?: string;
  size?: 'sm' | 'md';
  clearable?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  ariaLabel?: string;
  maxTags?: number;
}

withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  searchable: 'auto',
  searchPlaceholder: 'Buscar...',
  emptyText: 'Sin opciones',
  noResultsText: 'Sin resultados',
  size: 'md',
  clearable: true,
  required: false,
  disabled: false,
  error: null,
  ariaLabel: '',
  maxTags: 2,
});

const model = defineModel<UiSelectValue[]>({ default: () => [] });

const handleUpdate = (value: UiSelectValue | UiSelectValue[]) => {
  if (Array.isArray(value)) model.value = value;
};
</script>
