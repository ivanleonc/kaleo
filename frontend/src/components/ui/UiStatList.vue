<template>
  <dl
    :class="['ui-stat-list', `is-${layout}`]"
    :style="layout === 'grid' ? { '--stat-columns': columns } : undefined"
    :aria-label="label || undefined"
  >
    <div v-for="item in items" :key="item.key ?? item.label" class="ui-stat">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
export interface StatItem {
  key?: string;
  label: string;
  value: string | number;
}

withDefaults(defineProps<{
  items: StatItem[];
  layout?: 'inline' | 'grid';
  columns?: number;
  label?: string;
}>(), {
  layout: 'grid',
  columns: 3,
  label: '',
});
</script>

<style scoped>
.ui-stat-list {
  margin: 0;
}

.ui-stat-list.is-inline {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.ui-stat-list.is-grid {
  display: grid;
  grid-template-columns: repeat(var(--stat-columns, 3), minmax(0, 1fr));
  gap: var(--space-3);
}

.ui-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ui-stat dt {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ui-stat dd {
  margin: 0;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.is-inline .ui-stat dd {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.is-grid .ui-stat dd {
  font-size: var(--text-base);
  font-weight: 600;
}

@media (max-width: 640px) {
  .ui-stat-list.is-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .ui-stat-list.is-grid .ui-stat {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .ui-stat-list.is-inline {
    width: 100%;
    justify-content: space-between;
    gap: var(--space-4);
  }
}
</style>
