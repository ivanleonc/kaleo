<template>
  <div class="charts-grid">
    <UiCard class="chart-card chart-wide">
      <template #header>
        <h2 class="section-title">Consumo vs facturación</h2>
        <p class="section-subtitle">Energía consumida y facturada por periodo.</p>
      </template>
      <UiChart
        :option="consumptionOption"
        height="320px"
        label="Consumo y facturación por periodo"
        :summary="consumptionSummary"
        :data-table="consumptionData"
      />
    </UiCard>

    <UiCard class="chart-card">
      <template #header>
        <h2 class="section-title">Pérdidas por zona</h2>
        <p class="section-subtitle">Porcentaje de pérdidas no técnicas.</p>
      </template>
      <UiChart
        :option="lossesOption"
        height="320px"
        label="Porcentaje de pérdidas no técnicas por zona"
        :summary="lossesSummary"
        :data-table="lossesData"
      />
    </UiCard>

    <UiCard class="chart-card chart-trend">
      <template #header>
        <h2 class="section-title">Tendencia de pérdidas</h2>
        <p class="section-subtitle">Evolución mensual del porcentaje de pérdida.</p>
      </template>
      <UiChart
        :option="trendOption"
        height="320px"
        label="Tendencia mensual de pérdidas no técnicas"
        :summary="trendSummary"
        :data-table="trendData"
      />
    </UiCard>

    <UiCard class="chart-card">
      <template #header>
        <h2 class="section-title">Clientes por segmento</h2>
        <p class="section-subtitle">Distribución de la base de clientes.</p>
      </template>
      <UiChart
        :option="segmentsOption"
        height="320px"
        label="Distribución de clientes por segmento"
        :summary="segmentsSummary"
        :data-table="segmentsData"
      />
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsCoreOption } from 'echarts/core';
import UiCard from '@/components/ui/UiCard.vue';
import UiChart from '@/components/ui/UiChart.vue';
import { useTheme } from '@/composables/useTheme';
import type { EnergyDashboard } from '@/types/energy';
import { formatCompactNumber, formatEnergyKwh, formatInteger, formatPercent } from '@/utils/number';

const props = defineProps<{
  dashboard: EnergyDashboard;
}>();

const { isDarkMode } = useTheme();

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function periodLabel(period: string): string {
  const [year = '', month = ''] = period.split('-');
  const monthLabel = MONTHS[Number(month) - 1] ?? month;
  return `${monthLabel} ${year.slice(-2)}`;
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const chartTheme = computed(() => {
  const dark = isDarkMode.value;
  const fallbackText = dark ? '#c7c7c7' : '#6b7280';
  const fallbackStrong = dark ? '#f5f5f5' : '#111827';
  const fallbackGrid = dark ? '#333333' : '#e5e7eb';
  const fallbackPanel = dark ? '#1f1f1f' : '#ffffff';

  return {
    text: cssVar('--text-muted', fallbackText),
    textStrong: cssVar('--text-main', fallbackStrong),
    grid: cssVar('--border', fallbackGrid),
    panel: cssVar('--bg-card', fallbackPanel),
    green: cssVar('--accent-green', '#1c9c5a'),
    blue: cssVar('--accent-blue', '#1c53ba'),
    orange: cssVar('--accent-orange', '#c05a16'),
    purple: cssVar('--accent-purple', '#561cba'),
    warning: cssVar('--color-warning', '#ba7b1c'),
    danger: cssVar('--color-danger', '#ba1c29'),
    success: cssVar('--color-success', '#1cbaa5'),
  };
});

const commonAxis = computed(() => ({
  axisLine: { lineStyle: { color: chartTheme.value.grid } },
  axisTick: { show: false },
  axisLabel: { color: chartTheme.value.text, fontSize: 11 },
  splitLine: { lineStyle: { color: chartTheme.value.grid, type: 'dashed' as const } },
}));

const tooltipStyle = computed(() => ({
  backgroundColor: chartTheme.value.panel,
  borderColor: chartTheme.value.grid,
  borderWidth: 1,
  textStyle: { color: chartTheme.value.textStrong, fontSize: 12 },
}));

const consumptionOption = computed<EChartsCoreOption>(() => {
  const periods = props.dashboard.consumptionByPeriod.map((point) => periodLabel(point.period));

  return {
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle.value,
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const index = items[0]?.dataIndex ?? 0;
        const point = props.dashboard.consumptionByPeriod[index];
        if (!point) return '';
        return [
          `<strong>${escapeHtml(periodLabel(point.period))}</strong>`,
          `Consumo: ${formatEnergyKwh(point.consumptionKwh)}`,
          `Facturado: ${formatEnergyKwh(point.billedKwh)}`,
        ].join('<br/>');
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: chartTheme.value.text, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 8, right: 8, top: 38, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: periods,
      ...commonAxis.value,
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      ...commonAxis.value,
      axisLabel: {
        ...commonAxis.value.axisLabel,
        formatter: (value: number) => formatCompactNumber(value),
      },
    },
    series: [
      {
        name: 'Consumo',
        type: 'bar',
        barMaxWidth: 22,
        itemStyle: { color: chartTheme.value.green, borderRadius: [4, 4, 0, 0] },
        data: props.dashboard.consumptionByPeriod.map((point) => point.consumptionKwh),
      },
      {
        name: 'Facturado',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: chartTheme.value.blue },
        itemStyle: { color: chartTheme.value.blue },
        data: props.dashboard.consumptionByPeriod.map((point) => point.billedKwh),
      },
    ],
  };
});

const segmentsOption = computed<EChartsCoreOption>(() => {
  const colors = [
    chartTheme.value.green,
    chartTheme.value.blue,
    chartTheme.value.purple,
    chartTheme.value.orange,
    chartTheme.value.warning,
  ];

  return {
    tooltip: {
      trigger: 'item',
      ...tooltipStyle.value,
      formatter: (params: any) =>
        `${escapeHtml(String(params.name))}: ${formatInteger(Number(params.value))} clientes (${params.percent}%)`,
    },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: chartTheme.value.text, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: chartTheme.value.panel, borderWidth: 2 },
        label: {
          color: chartTheme.value.text,
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: { lineStyle: { color: chartTheme.value.grid } },
        data: props.dashboard.clientsBySegment.map((segment, index) => ({
          name: segment.label,
          value: segment.value,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
});

const lossesOption = computed<EChartsCoreOption>(() => {
  const zones = [...props.dashboard.lossesByZone].reverse();

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...tooltipStyle.value,
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const zone = zones[item?.dataIndex ?? 0];
        if (!zone) return '';
        return [
          `<strong>${escapeHtml(zone.zone)}</strong>`,
          `Pérdidas: ${formatEnergyKwh(zone.lossesKwh)}`,
          `Porcentaje: ${formatPercent(zone.lossesPct)}`,
        ].join('<br/>');
      },
    },
    grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      ...commonAxis.value,
      axisLabel: {
        ...commonAxis.value.axisLabel,
        formatter: (value: number) => `${value}%`,
      },
    },
    yAxis: {
      type: 'category',
      data: zones.map((zone) => zone.zone),
      ...commonAxis.value,
      splitLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: zones.map((zone) => ({
          value: zone.lossesPct,
          itemStyle: {
            color:
              zone.lossesPct >= 14
                ? chartTheme.value.danger
                : zone.lossesPct >= 10
                  ? chartTheme.value.warning
                  : chartTheme.value.success,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: chartTheme.value.text,
          fontSize: 11,
          formatter: (params: any) => `${params.value}%`,
        },
      },
    ],
  };
});

const consumptionData = computed(() => ({
  caption: 'Consumo y facturación por periodo',
  headers: ['Periodo', 'Consumo', 'Facturado'],
  rows: props.dashboard.consumptionByPeriod.map((point) => [
    periodLabel(point.period),
    formatEnergyKwh(point.consumptionKwh),
    formatEnergyKwh(point.billedKwh),
  ]),
}));

const consumptionSummary = computed(() => {
  const points = props.dashboard.consumptionByPeriod;
  if (!points.length) return 'No hay datos de consumo para el periodo analizado.';
  const total = points.reduce((sum, point) => sum + point.consumptionKwh, 0);
  return `Consumo total de ${formatEnergyKwh(total)} distribuido en ${points.length} periodos.`;
});

const segmentsData = computed(() => ({
  caption: 'Clientes por segmento',
  headers: ['Segmento', 'Clientes'],
  rows: props.dashboard.clientsBySegment.map((segment) => [
    segment.label,
    formatInteger(segment.value),
  ]),
}));

const segmentsSummary = computed(() => {
  const segments = props.dashboard.clientsBySegment;
  if (!segments.length) return 'No hay segmentos de clientes para mostrar.';
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return `${formatInteger(total)} clientes distribuidos en ${segments.length} segmentos.`;
});

const lossesData = computed(() => ({
  caption: 'Pérdidas no técnicas por zona',
  headers: ['Zona', 'Pérdidas', '% Pérdida'],
  rows: props.dashboard.lossesByZone.map((zone) => [
    zone.zone,
    formatEnergyKwh(zone.lossesKwh),
    formatPercent(zone.lossesPct),
  ]),
}));

const lossesSummary = computed(() => {
  const zones = props.dashboard.lossesByZone;
  if (!zones.length) return 'No hay zonas con pérdidas para mostrar.';
  const highest = zones.reduce((max, zone) =>
    zone.lossesPct > max.lossesPct ? zone : max,
  );
  return `Se comparan ${zones.length} zonas; la mayor pérdida es ${formatPercent(highest.lossesPct)} en ${highest.zone}.`;
});

const trendData = computed(() => ({
  caption: 'Tendencia mensual de pérdidas no técnicas',
  headers: ['Periodo', '% Pérdida'],
  rows: props.dashboard.lossTrend.map((point) => [
    periodLabel(point.period),
    formatPercent(point.lossesPct),
  ]),
}));

const trendSummary = computed(() => {
  const points = props.dashboard.lossTrend;
  if (!points.length) return 'No hay datos de tendencia para el periodo.';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `La pérdida pasa de ${formatPercent(first.lossesPct)} a ${formatPercent(last.lossesPct)} entre ${periodLabel(first.period)} y ${periodLabel(last.period)}.`;
});

const trendOption = computed<EChartsCoreOption>(() => {
  const periods = props.dashboard.lossTrend.map((point) => periodLabel(point.period));

  return {
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle.value,
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const point = props.dashboard.lossTrend[item?.dataIndex ?? 0];
        if (!point) return '';
        return `<strong>${escapeHtml(periodLabel(point.period))}</strong><br/>Pérdidas: ${formatPercent(point.lossesPct)}`;
      },
    },
    grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: periods,
      ...commonAxis.value,
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      ...commonAxis.value,
      axisLabel: {
        ...commonAxis.value.axisLabel,
        formatter: (value: number) => `${value}%`,
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: chartTheme.value.orange },
        itemStyle: { color: chartTheme.value.orange },
        areaStyle: { opacity: 0.12 },
        data: props.dashboard.lossTrend.map((point) => point.lossesPct),
      },
    ],
  };
});
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.chart-card {
  min-width: 0;
}

.chart-wide {
  grid-column: span 2;
}

.chart-trend {
  grid-column: span 2;
}

.section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.section-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .chart-wide,
  .chart-trend {
    grid-column: span 1;
  }
}
</style>
