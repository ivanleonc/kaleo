<template>
  <figure class="ui-chart">
    <div
      class="ui-chart-canvas"
      role="img"
      :aria-label="label"
      :aria-describedby="summary ? summaryId : undefined"
      :style="{ height }"
    >
      <UiChartCanvas :option="option" :loading="loading" />
    </div>
    <figcaption v-if="summary" :id="summaryId" class="sr-only">{{ summary }}</figcaption>

    <details v-if="dataTable" class="chart-data">
      <summary>Ver datos</summary>
      <div class="chart-data-scroll">
        <table class="ui-table">
          <caption class="sr-only">{{ dataTable.caption }}</caption>
          <thead>
            <tr>
              <th
                v-for="header in dataTable.headers"
                :key="header"
                scope="col"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in dataTable.rows" :key="index">
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                :data-label="dataTable.headers[cellIndex]"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>

<script setup lang="ts">
import { defineAsyncComponent, useId } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';

const UiChartCanvas = defineAsyncComponent(
  () => import('@/components/ui/UiChartCanvas.vue'),
);

interface ChartDataTable {
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

const summaryId = `ui-chart-summary-${useId()}`;

withDefaults(defineProps<{
  option: EChartsCoreOption;
  loading?: boolean;
  height?: string;
  label?: string;
  summary?: string;
  dataTable?: ChartDataTable;
}>(), {
  loading: false,
  height: '320px',
  label: 'Gráfico de datos',
  summary: '',
  dataTable: undefined,
});
</script>

<style scoped>
.ui-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  min-width: 0;
}

.ui-chart-canvas {
  width: 100%;
  min-width: 0;
}

.chart-data {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.chart-data summary {
  width: fit-content;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
}

.chart-data summary:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.chart-data summary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.chart-data-scroll {
  margin-top: var(--space-2);
  overflow-x: auto;
}

.chart-data .ui-table {
  font-size: var(--text-xs);
}
</style>
