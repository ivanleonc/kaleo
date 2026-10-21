<template>
  <figure class="ui-chart">
    <div
      class="ui-chart-canvas"
      role="img"
      :aria-label="label"
      :aria-describedby="summary ? summaryId : undefined"
      :style="{ height }"
    >
      <VChart
        :option="option"
        :loading="loading"
        style="width: 100%; height: 100%"
        autoresize
      />
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
import { useId } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import type { EChartsCoreOption } from 'echarts/core';

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

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
