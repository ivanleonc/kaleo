<template>
  <div
    class="ui-tabs"
    :class="[`ui-tabs--${variant}`, { 'ui-tabs--scroll': scrollable }]"
    role="tablist"
    tabindex="0"
    :aria-label="groupLabel"
    @keydown="onKeydown"
  >
    <button
      v-for="(tab, index) in tabs"
      :id="tabElementId(tab.value)"
      :key="tab.value"
      :ref="(el) => setTabRef(el, index)"
      type="button"
      role="tab"
      class="ui-tab"
      :class="{ 'is-active': modelValue === tab.value }"
      :aria-selected="modelValue === tab.value"
      :aria-controls="panelElementId(tab.value)"
      :tabindex="modelValue === tab.value ? 0 : -1"
      @click="select(tab.value)"
    >
      <component
        :is="tab.icon"
        v-if="tab.icon"
        :size="16"
        stroke-width="1.8"
        aria-hidden="true"
      />
      <span class="ui-tab-label">{{ tab.label }}</span>
      <span v-if="tab.count !== undefined" class="ui-tab-count">{{ tab.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { UiTabItem } from '@/types/ui';

interface Props {
  tabs: UiTabItem[];
  groupLabel: string;
  variant?: 'underline' | 'pills';
  scrollable?: boolean;
  panelIdPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'underline',
  scrollable: false,
  panelIdPrefix: 'ui-tabs',
});

const model = defineModel<string>({ required: true });

const tabRefs = ref<Array<HTMLButtonElement | null>>([]);

const setTabRef = (el: unknown, index: number) => {
  tabRefs.value[index] = el instanceof HTMLButtonElement ? el : null;
};

const tabElementId = (value: string) => `${props.panelIdPrefix}-tab-${value}`;
const panelElementId = (value: string) => `${props.panelIdPrefix}-panel-${value}`;

const select = (value: string) => {
  model.value = value;
};

const focusTab = (index: number) => {
  const tab = props.tabs[index];
  if (!tab) return;
  model.value = tab.value;
  tabRefs.value[index]?.focus();
};

const onKeydown = (event: KeyboardEvent) => {
  const current = props.tabs.findIndex((tab) => tab.value === model.value);
  if (current === -1) return;

  let next: number | null = null;
  if (event.key === 'ArrowRight') next = (current + 1) % props.tabs.length;
  else if (event.key === 'ArrowLeft') next = (current - 1 + props.tabs.length) % props.tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = props.tabs.length - 1;

  if (next === null) return;
  event.preventDefault();
  focusTab(next);
};
</script>

<style scoped>
.ui-tabs {
  display: flex;
  gap: var(--space-1);
}

.ui-tabs--scroll {
  overflow-x: auto;
  scrollbar-width: thin;
}

.ui-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}

.ui-tab:hover {
  color: var(--text-main);
  background: var(--bg-hover);
}

.ui-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.ui-tab.is-active {
  color: var(--text-main);
  font-weight: 600;
}

/* Variante subrayada */
.ui-tabs--underline {
  border-bottom: 1px solid var(--border);
}

.ui-tabs--underline .ui-tab {
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.ui-tabs--underline .ui-tab.is-active {
  border-bottom-color: var(--primary);
}

/* Variante píldora */
.ui-tabs--pills {
  flex-wrap: wrap;
}

.ui-tabs--pills .ui-tab {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
}

.ui-tabs--pills .ui-tab.is-active {
  border-color: var(--primary);
  background: var(--primary-soft, var(--bg-hover));
  color: var(--text-main);
}

.ui-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 var(--space-1);
  border-radius: 999px;
  background: var(--bg-hover);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 500;
}

.ui-tab.is-active .ui-tab-count {
  background: var(--primary);
  color: var(--primary-contrast, #fff);
}

@media (max-width: 640px) {
  .ui-tabs:not(.ui-tabs--pills) {
    overflow-x: auto;
  }
}
</style>
