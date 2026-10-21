<template>
  <div class="ui-select-wrapper">
    <label v-if="label" :for="id" class="ui-label">
      {{ label }} <span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </label>

    <ComboboxRoot
      v-model:open="open"
      :model-value="rekaModel"
      :multiple="multiple"
      :disabled="disabled"
      :reset-search-term-on-blur="true"
      :reset-search-term-on-select="!multiple"
      open-on-click
      @update:model-value="handleModelUpdate"
    >
      <ComboboxAnchor
        class="ui-select"
        :class="[
          `ui-select--${size}`,
          {
            'has-error': !!error,
            'has-clear': canClear,
            'is-disabled': disabled,
            'is-multiple': multiple,
            'is-open': open,
            'is-readonly': !searchEnabled,
          },
        ]"
        @focusin="selectInputText"
        @click="handleControlClick"
      >
        <div class="ui-select-body">
          <template v-if="multiple">
            <span
              v-for="option in visibleSelected"
              :key="option.value"
              class="ui-select-chip"
              :class="option.tone ? `is-${option.tone}` : undefined"
            >
              <span class="ui-select-chip-label">{{ option.label }}</span>
              <button
                type="button"
                class="ui-select-chip-remove"
                :aria-label="`Quitar ${option.label}`"
                @mousedown.prevent
                @click.stop="removeValue(option.value)"
              >
                <IconX :size="12" stroke-width="2.4" aria-hidden="true" />
              </button>
            </span>
            <span
              v-if="hiddenSelectedCount > 0"
              class="ui-select-chip ui-select-chip-more"
              :title="hiddenSelectedTitle"
            >
              +{{ hiddenSelectedCount }}
            </span>
          </template>

          <ComboboxInput
            :id="id"
            class="ui-select-input"
            :readonly="!searchEnabled"
            :disabled="disabled"
            :required="required"
            :placeholder="inputPlaceholder"
            :display-value="multiple ? undefined : displayValue"
            :aria-label="label ? undefined : ariaLabel || undefined"
            :aria-invalid="!!error"
            :aria-required="required"
            :aria-describedby="error ? errorId : undefined"
            autocapitalize="none"
            spellcheck="false"
          />
        </div>

        <button
          v-if="canClear"
          type="button"
          class="ui-select-clear"
          aria-label="Limpiar selección"
          @mousedown.prevent
          @click.stop="clear"
        >
          <IconX :size="14" stroke-width="2" aria-hidden="true" />
        </button>

        <ComboboxTrigger
          class="ui-select-chevron"
          :aria-label="open ? 'Ocultar opciones' : 'Mostrar opciones'"
        >
          <IconSelector :size="16" stroke-width="2" aria-hidden="true" />
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          class="ui-select-content"
          position="popper"
          align="start"
          :side-offset="4"
          :collision-padding="8"
          :style="{ zIndex: 140 }"
        >
          <ComboboxViewport class="ui-select-viewport">
            <ComboboxEmpty class="ui-select-empty">
              {{ options.length === 0 ? emptyText : noResultsText }}
            </ComboboxEmpty>

            <ComboboxGroup
              v-for="group in groupedOptions"
              :key="group.label"
              class="ui-select-group"
            >
              <ComboboxLabel v-if="group.label" class="ui-select-group-label">
                {{ group.label }}
              </ComboboxLabel>

              <ComboboxItem
                v-for="option in group.options"
                :key="`${option.value}-${option.label}`"
                :value="toRekaValue(option.value)"
                :text-value="searchText(option)"
                :disabled="option.disabled"
                class="ui-select-option"
              >
                <span
                  v-if="option.tone"
                  class="ui-select-tone"
                  :class="`is-${option.tone}`"
                  aria-hidden="true"
                />
                <span class="ui-select-option-copy">
                  <span class="ui-select-option-label">{{ option.label }}</span>
                  <span v-if="option.description" class="ui-select-option-description">
                    {{ option.description }}
                  </span>
                </span>
                <ComboboxItemIndicator class="ui-select-indicator">
                  <IconCheck :size="16" stroke-width="2.2" aria-hidden="true" />
                </ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <UiFieldError :message="error" :id="errorId" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { IconCheck, IconSelector, IconX } from '@tabler/icons-vue';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui';
import UiFieldError from '@/components/ui/UiFieldError.vue';
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
  multiple?: boolean;
  maxTags?: number;
}

const props = withDefaults(defineProps<Props>(), {
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
  multiple: false,
  maxTags: 2,
});

const model = defineModel<UiSelectValue | UiSelectValue[]>({ required: true });

const id = useId();
const errorId = `${id}-error`;
const open = ref(false);
const emptyValue = `__ui_select_empty__${id}__`;

const emptyOption = computed(() => props.options.find((option) => option.value === ''));

const selectedValues = computed<UiSelectValue[]>(() => {
  if (props.multiple) return Array.isArray(model.value) ? model.value : [];
  if (model.value === '' || model.value == null) return [];
  return [model.value as UiSelectValue];
});

const optionByValue = computed(() => {
  const map = new Map<UiSelectValue, UiSelectOption>();
  props.options.forEach((option) => map.set(option.value, option));
  return map;
});

const selectedOptions = computed<UiSelectOption[]>(() =>
  selectedValues.value.map(
    (value) => optionByValue.value.get(value) ?? { label: String(value), value },
  ),
);

const visibleSelected = computed(() =>
  props.maxTags > 0 ? selectedOptions.value.slice(0, props.maxTags) : selectedOptions.value,
);

const hiddenSelected = computed(() => selectedOptions.value.slice(visibleSelected.value.length));
const hiddenSelectedCount = computed(() => hiddenSelected.value.length);
const hiddenSelectedTitle = computed(() =>
  hiddenSelected.value.map((option) => option.label).join(', '),
);

const hasValue = computed(() =>
  props.multiple
    ? selectedValues.value.length > 0
    : model.value !== '' && model.value != null,
);

const canClear = computed(
  () => props.clearable && !props.required && !props.disabled && hasValue.value,
);

const searchEnabled = computed(() => {
  if (typeof props.searchable === 'boolean') return props.searchable;
  return props.options.length > 7;
});

const inputPlaceholder = computed(() => {
  if (props.multiple && selectedOptions.value.length > 0) {
    return searchEnabled.value ? props.searchPlaceholder : '';
  }
  return props.placeholder;
});

const rekaModel = computed(() => {
  if (props.multiple) return selectedValues.value.map(toRekaValue);
  if (model.value === '' || model.value == null) {
    return emptyOption.value ? emptyValue : undefined;
  }
  return toRekaValue(model.value as UiSelectValue);
});

const groupedOptions = computed(() => {
  const groups = new Map<string, UiSelectOption[]>();
  props.options.forEach((option) => {
    const key = option.group ?? '';
    const group = groups.get(key) ?? [];
    group.push(option);
    groups.set(key, group);
  });
  return Array.from(groups, ([label, options]) => ({ label, options }));
});

const toRekaValue = (value: UiSelectValue) => (value === '' ? emptyValue : value);

const fromRekaValue = (value: unknown): UiSelectValue => {
  if (value == null || value === emptyValue) return '';
  return value as UiSelectValue;
};

const handleModelUpdate = (value: unknown) => {
  if (props.multiple) {
    const values = Array.isArray(value) ? value : [];
    model.value = values.map(fromRekaValue);
    return;
  }
  model.value = fromRekaValue(value);
};

const displayValue = (value: unknown) => {
  if (value === emptyValue) return emptyOption.value?.label ?? '';
  if (value == null || value === '') return '';
  return optionByValue.value.get(value as UiSelectValue)?.label ?? String(value);
};

const searchText = (option: UiSelectOption) =>
  [option.label, option.description, option.group, ...(option.keywords ?? [])]
    .filter(Boolean)
    .join(' ');

const selectInputText = (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement) target.select();
};

const handleControlClick = (event: MouseEvent) => {
  if (props.disabled) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('button')) return;
  const input = (event.currentTarget as HTMLElement | null)?.querySelector('input');
  if (!input) return;
  if (document.activeElement !== input) input.focus();
  input.select();
  open.value = true;
};

const clear = () => {
  model.value = props.multiple ? [] : '';
  open.value = false;
};

const removeValue = (value: UiSelectValue) => {
  if (!props.multiple) return;
  const values = Array.isArray(model.value) ? model.value : [];
  model.value = values.filter((item) => item !== value);
};
</script>

<style scoped>
.ui-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}

.ui-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-main);
}

.required-mark {
  color: var(--color-danger);
}

.ui-select {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
  padding-right: 2.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  color: var(--text-main);
  font-size: var(--text-base);
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}

.ui-select.has-clear {
  padding-right: 3.75rem;
}

.ui-select-body {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.25rem 0.75rem;
}

.ui-select-input {
  flex: 1;
  min-width: 3rem;
  height: 2rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  line-height: 1.4;
  outline: none;
  cursor: text;
}

.ui-select-input.is-readonly,
.ui-select.is-readonly .ui-select-input {
  cursor: pointer;
}

.ui-select-input::placeholder {
  color: var(--text-muted);
}

.ui-select:focus-within {
  border-color: var(--text-main);
  box-shadow: 0 0 0 1px var(--text-main);
}

.ui-select.has-error {
  border-color: var(--color-danger);
}

.ui-select.has-error:focus-within {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px var(--color-danger);
}

.ui-select.is-disabled {
  background-color: var(--bg-hover);
  cursor: not-allowed;
  opacity: 0.5;
}

.ui-select-chevron {
  position: absolute;
  top: 50%;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.ui-select-chevron:hover {
  color: var(--text-main);
}

.ui-select-chevron[data-state='open'] {
  color: var(--text-main);
}

.ui-select-clear {
  position: absolute;
  top: 50%;
  right: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.ui-select-clear:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.ui-select-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  max-width: 100%;
  min-height: 1.5rem;
  padding: 0.0625rem 0.25rem 0.0625rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  font-size: var(--text-xs);
  line-height: 1.3;
}

.ui-select-chip.is-success {
  border-color: var(--color-success-border);
  background-color: var(--color-success-bg);
}

.ui-select-chip.is-warning {
  border-color: var(--color-warning-border);
  background-color: var(--color-warning-bg);
}

.ui-select-chip.is-danger {
  border-color: var(--color-danger-border);
  background-color: var(--color-danger-bg);
}

.ui-select-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ui-select-chip-remove:hover {
  background-color: var(--bg-card);
  color: var(--text-main);
}

.ui-select-chip-more {
  padding-right: 0.5rem;
  color: var(--text-muted);
}

.ui-select--sm {
  min-height: 2rem;
  font-size: var(--text-sm);
}

.ui-select--sm .ui-select-body {
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
}

.ui-select--sm .ui-select-input {
  height: 1.5rem;
}

.ui-select--sm .ui-select-chevron {
  width: 2rem;
}

.ui-select--sm.has-clear {
  padding-right: 3.25rem;
}

.ui-select--sm .ui-select-clear {
  right: 2rem;
  width: 1.25rem;
  height: 1.25rem;
}

@media (pointer: coarse) {
  .ui-select {
    min-height: 2.75rem;
    font-size: 1rem;
  }

  .ui-select-input {
    height: 2.25rem;
    font-size: 1rem;
  }

  .ui-select-chevron {
    width: 2.75rem;
  }

  .ui-select.has-clear {
    padding-right: 5.25rem;
  }

  .ui-select-clear {
    right: 2.75rem;
    width: 2.25rem;
    height: 2.25rem;
  }
}
</style>

<style>
.ui-select-content {
  display: flex;
  flex-direction: column;
  width: max(var(--reka-combobox-trigger-width, 12rem), 12rem);
  max-width: min(24rem, calc(100vw - 1rem));
  max-height: min(20rem, 50vh);
  overflow: hidden;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-lg);
}

.ui-select-viewport {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ui-select-group + .ui-select-group {
  margin-top: 0.125rem;
}

.ui-select-group-label {
  display: block;
  padding: 0.375rem 0.75rem 0.25rem;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ui-select-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-main);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.ui-select-option[data-highlighted] {
  background-color: var(--bg-hover);
}

.ui-select-option[data-state='checked'] {
  color: var(--color-info-text);
}

.ui-select-option[data-disabled] {
  cursor: not-allowed;
  opacity: 0.45;
}

.ui-select-option-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.ui-select-option-label {
  overflow: hidden;
  font-size: var(--text-base);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select-option-description {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select-indicator {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--color-info);
}

.ui-select-tone {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background-color: var(--text-muted);
}

.ui-select-tone.is-success {
  background-color: var(--color-success);
}

.ui-select-tone.is-warning {
  background-color: var(--color-warning);
}

.ui-select-tone.is-danger {
  background-color: var(--color-danger);
}

.ui-select-empty {
  padding: 0.75rem;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
}

@media (pointer: coarse) {
  .ui-select-option {
    min-height: 2.75rem;
  }

  .ui-select-option-label {
    font-size: 1rem;
  }
}
</style>
