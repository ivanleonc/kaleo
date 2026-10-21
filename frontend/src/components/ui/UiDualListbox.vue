<template>
  <div class="dual-listbox">
    <span v-if="label" :id="labelId" class="ui-label">{{ label }}</span>

    <div class="dual-listbox-container" role="group" :aria-labelledby="label ? labelId : undefined">
      <!-- Disponibles -->
      <div class="listbox-panel">
        <div class="panel-header">
          <span :id="availableTitleId" class="panel-title">{{ availableLabel }}</span>
          <span class="panel-count">{{ filteredAvailable.length }}</span>
        </div>
        <div class="panel-search">
          <input
            v-model="searchAvailable"
            type="search"
            class="panel-search-input"
            :placeholder="searchPlaceholder"
            :aria-label="`Buscar en ${availableLabel}`"
          />
        </div>
        <!-- Roving tabindex (patrón APG): el foco vive en las opciones, no en el contenedor. -->
        <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
        <ul
          class="panel-list"
          role="listbox"
          aria-multiselectable="true"
          :aria-labelledby="availableTitleId"
          @keydown="onPanelKeydown('available', $event)"
        >
          <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus, vuejs-accessibility/click-events-have-key-events -- tabindex es dinámico (roving) y las flechas/Enter se manejan en el panel con onPanelKeydown -->
          <li
            v-for="(item, i) in filteredAvailable"
            :key="item.id"
            class="panel-item"
            :class="{ selected: tempAvailable.includes(item.id) }"
            role="option"
            :aria-selected="tempAvailable.includes(item.id)"
            :tabindex="i === activeAvailable ? 0 : -1"
            :data-id="item.id"
            @click="toggleTempAvailable(item.id)"
            @focus="activeAvailable = i"
            @dblclick="moveToSelected([item.id])"
          >
            <span class="item-label">{{ item.label }}</span>
            <span v-if="item.description" class="item-description">{{ item.description }}</span>
          </li>
          <li v-if="filteredAvailable.length === 0" class="panel-empty" role="presentation">
            Sin resultados
          </li>
        </ul>
      </div>

      <!-- Acciones -->
      <div class="listbox-actions">
        <button
          type="button"
          class="action-btn"
          :disabled="tempAvailable.length === 0"
          :title="`Mover ${tempAvailable.length} seleccionado(s) a ${selectedLabel}`"
          :aria-label="`Mover seleccionados a ${selectedLabel}`"
          @click="moveToSelected(tempAvailable)"
        >
          <IconChevronRight :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="action-btn"
          :disabled="tempSelected.length === 0"
          :title="`Mover ${tempSelected.length} seleccionado(s) a ${availableLabel}`"
          :aria-label="`Mover seleccionados a ${availableLabel}`"
          @click="moveToAvailable(tempSelected)"
        >
          <IconChevronLeft :size="16" aria-hidden="true" />
        </button>
        <div class="action-divider" role="presentation" />
        <button
          type="button"
          class="action-btn"
          :disabled="props.modelValue.length === 0"
          title="Mover todos a la derecha"
          :aria-label="`Mover todos a ${selectedLabel}`"
          @click="moveAllToSelected"
        >
          <IconChevronsRight :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="action-btn"
          :disabled="props.modelValue.length === 0"
          title="Mover todos a la izquierda"
          :aria-label="`Mover todos a ${availableLabel}`"
          @click="moveAllToAvailable"
        >
          <IconChevronsLeft :size="16" aria-hidden="true" />
        </button>
      </div>

      <!-- Seleccionados -->
      <div class="listbox-panel">
        <div class="panel-header">
          <span :id="selectedTitleId" class="panel-title">{{ selectedLabel }}</span>
          <span class="panel-count">{{ filteredSelected.length }}</span>
        </div>
        <div class="panel-search">
          <input
            v-model="searchSelected"
            type="search"
            class="panel-search-input"
            :placeholder="searchPlaceholder"
            :aria-label="`Buscar en ${selectedLabel}`"
          />
        </div>
        <!-- Roving tabindex (patrón APG): el foco vive en las opciones, no en el contenedor. -->
        <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
        <ul
          class="panel-list"
          role="listbox"
          aria-multiselectable="true"
          :aria-labelledby="selectedTitleId"
          @keydown="onPanelKeydown('selected', $event)"
        >
          <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus, vuejs-accessibility/click-events-have-key-events -- tabindex es dinámico (roving) y las flechas/Enter se manejan en el panel con onPanelKeydown -->
          <li
            v-for="(item, i) in filteredSelected"
            :key="item.id"
            class="panel-item selected"
            :class="{ 'temp-selected': tempSelected.includes(item.id) }"
            role="option"
            :aria-selected="tempSelected.includes(item.id)"
            :tabindex="i === activeSelected ? 0 : -1"
            :data-id="item.id"
            @click="toggleTempSelected(item.id)"
            @focus="activeSelected = i"
            @dblclick="moveToAvailable([item.id])"
          >
            <span class="item-label">{{ item.label }}</span>
            <span v-if="item.description" class="item-description">{{ item.description }}</span>
          </li>
          <li v-if="filteredSelected.length === 0" class="panel-empty" role="presentation">
            Sin resultados
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, useId } from 'vue';
import {
  IconChevronRight,
  IconChevronLeft,
  IconChevronsRight,
  IconChevronsLeft,
} from '@tabler/icons-vue';

export interface DualListboxItem {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  modelValue: string[];
  available: DualListboxItem[];
  selected: DualListboxItem[];
  label?: string;
  availableLabel?: string;
  selectedLabel?: string;
  searchPlaceholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  availableLabel: 'Disponibles',
  selectedLabel: 'Seleccionados',
  searchPlaceholder: 'Buscar...',
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

// IDs únicos por instancia: con dos listboxes en el DOM (ej. modales de
// crear + editar abiertos) los aria-labelledby estáticos apuntarían al
// elemento equivocado. Mismo patrón que UiInput y UiSelect.
const uid = useId();
const labelId = `${uid}-label`;
const availableTitleId = `${uid}-available-title`;
const selectedTitleId = `${uid}-selected-title`;

const searchAvailable = ref('');
const searchSelected = ref('');
const tempAvailable = ref<string[]>([]);
const tempSelected = ref<string[]>([]);
const activeAvailable = ref(0);
const activeSelected = ref(0);

const filteredAvailable = computed(() => {
  const q = searchAvailable.value.trim().toLowerCase();
  return props.available.filter(
    (item) => !props.modelValue.includes(item.id) && item.label.toLowerCase().includes(q),
  );
});

const filteredSelected = computed(() => {
  const q = searchSelected.value.trim().toLowerCase();
  return props.selected.filter(
    (item) => props.modelValue.includes(item.id) && item.label.toLowerCase().includes(q),
  );
});

function toggleTempAvailable(id: string) {
  const idx = tempAvailable.value.indexOf(id);
  if (idx >= 0) tempAvailable.value.splice(idx, 1);
  else tempAvailable.value.push(id);
}

function toggleTempSelected(id: string) {
  const idx = tempSelected.value.indexOf(id);
  if (idx >= 0) tempSelected.value.splice(idx, 1);
  else tempSelected.value.push(id);
}

function moveToSelected(ids: string[]) {
  if (ids.length === 0) return;
  const next = [...props.modelValue, ...ids.filter((id) => !props.modelValue.includes(id))];
  emit('update:modelValue', next);
  tempAvailable.value = tempAvailable.value.filter((id) => !ids.includes(id));
}

function moveToAvailable(ids: string[]) {
  if (ids.length === 0) return;
  emit('update:modelValue', props.modelValue.filter((id) => !ids.includes(id)));
  tempSelected.value = tempSelected.value.filter((id) => !ids.includes(id));
}

/**
 * "Mover todos" ignora el buscador a propósito: si respetara el filtro, limpiar
 * el panel derecho con una búsqueda activa descartaría en silencio las
 * selecciones que no coincidían con ella.
 */
function moveAllToSelected() {
  emit('update:modelValue', props.available.map((i) => i.id));
  tempAvailable.value = [];
  tempSelected.value = [];
  searchSelected.value = '';
}

function moveAllToAvailable() {
  emit('update:modelValue', []);
  tempSelected.value = [];
  tempAvailable.value = [];
  searchAvailable.value = '';
}

/** Navegación por teclado de los paneles (patrón listbox con tabindex único). */
function onPanelKeydown(panel: 'available' | 'selected', event: KeyboardEvent) {
  const isAvailable = panel === 'available';
  const list = (isAvailable ? filteredAvailable : filteredSelected).value;
  const active = isAvailable ? activeAvailable : activeSelected;

  if (list.length === 0) return;

  // currentTarget se anula al terminar el dispatch, hay que leerlo ya.
  const panelEl = event.currentTarget as HTMLElement | null;

  const setActive = (index: number) => {
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    if (isAvailable) activeAvailable.value = clamped;
    else activeSelected.value = clamped;
    nextTick(() => {
      panelEl?.querySelectorAll<HTMLElement>('[role="option"]')[clamped]?.focus();
    });
  };

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      setActive(active.value + 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      setActive(active.value - 1);
      break;
    case 'Home':
      event.preventDefault();
      setActive(0);
      break;
    case 'End':
      event.preventDefault();
      setActive(list.length - 1);
      break;
    case 'Enter':
    case ' ': {
      const id = list[active.value]?.id;
      if (!id) return;
      event.preventDefault();
      if (isAvailable) toggleTempAvailable(id);
      else toggleTempSelected(id);
      break;
    }
  }
}

// El índice activo se reajusta al cambiar el filtro para no apuntar a "nada".
watch(filteredAvailable, (list) => {
  if (activeAvailable.value > list.length - 1) activeAvailable.value = 0;
});
watch(filteredSelected, (list) => {
  if (activeSelected.value > list.length - 1) activeSelected.value = 0;
});
</script>

<style scoped>
.dual-listbox {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-label {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-main);
  line-height: 1.25;
}

.dual-listbox-container {
  display: flex;
  align-items: stretch;
  gap: var(--space-3);
}

.listbox-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-card);
}

.listbox-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex-shrink: 0;
  width: 2.5rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--border);
  background-color: var(--bg-app);
}

.panel-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.panel-count {
  min-width: 1.5rem;
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--text-muted);
}

.panel-search {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-light);
}

.panel-search-input {
  width: 100%;
  height: 2rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  color: var(--text-main);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.panel-search-input::placeholder {
  color: var(--text-muted);
}

.panel-search-input:focus-visible {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 1px var(--focus-ring);
}

.panel-list {
  list-style: none;
  margin: 0;
  padding: var(--space-1);
  min-height: 13rem;
  max-height: 16rem;
  overflow-y: auto;
  scrollbar-width: thin;
}

.panel-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.12s;
}

.panel-item:hover {
  background-color: var(--bg-hover);
}

.panel-item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.panel-item.selected {
  background-color: var(--bg-hover);
}

.panel-item.temp-selected {
  background-color: var(--color-primary-light);
}

.item-label {
  font-size: var(--text-sm);
  line-height: 1.35;
  color: var(--text-main);
}

.item-description {
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--text-muted);
}

.panel-empty {
  display: grid;
  place-items: center;
  min-height: 13rem;
  padding: var(--space-6) var(--space-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.action-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--text-main);
  background-color: var(--text-main);
  color: var(--bg-card);
}

.action-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.action-divider {
  width: 1rem;
  height: 1px;
  margin: var(--space-1) 0;
  background-color: var(--border);
}

@media (max-width: 640px) {
  .dual-listbox-container {
    flex-direction: column;
  }

  .listbox-actions {
    flex-direction: row;
    width: 100%;
    padding: var(--space-2) 0;
  }

  .action-divider {
    width: 1px;
    height: 1.5rem;
    margin: 0 var(--space-1);
  }

  .panel-search-input {
    height: 2.5rem;
  }
}

@media (pointer: coarse) {
  .action-btn {
    width: 2.75rem;
    height: 2.75rem;
  }

  .panel-item {
    padding-top: var(--space-3);
    padding-bottom: var(--space-3);
  }
}
</style>
