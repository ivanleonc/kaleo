<template>
  <div class="energy-dashboard">
    <section class="result-summary" aria-label="Resumen del archivo procesado">
      <div class="result-file">
        <div class="result-file-icon">
          <IconFileSpreadsheet :size="22" stroke-width="1.8" />
        </div>
        <div class="result-file-text">
          <span class="result-file-name" :title="dashboard.meta.fileName">
            {{ dashboard.meta.fileName }}
          </span>
          <span class="result-file-date">
            Procesado el {{ formatDateTime(dashboard.meta.processedAt) }}
          </span>
        </div>
      </div>

      <div class="result-meta">
        <div class="meta-item">
          <span class="meta-label">Registros</span>
          <strong class="meta-value">{{ formatInteger(dashboard.meta.rowsProcessed) }}</strong>
        </div>
        <div class="meta-item">
          <span class="meta-label">Periodo</span>
          <strong class="meta-value">{{ periodRange }}</strong>
        </div>
        <UiBadge
          v-if="dashboard.meta.source === 'mock'"
          variant="warning"
          label="Datos de demostración"
        />
        <UiBadge
          v-else
          variant="success"
          label="Datos de la API"
        />
      </div>
    </section>

    <section class="metrics-grid" aria-label="Indicadores principales">
      <UiMetricCard
        title="Clientes facturados"
        :value="formatInteger(dashboard.kpis.totalClients)"
        trend-text="Base total analizada"
        color="blue"
      >
        <template #icon>
          <IconUsers :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Consumo total"
        :value="formatEnergyKwh(dashboard.kpis.totalConsumptionKwh)"
        trend-text="Energía consumida en el periodo"
        color="green"
      >
        <template #icon>
          <IconBolt :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Pérdidas no técnicas"
        :value="formatPercent(dashboard.kpis.nonTechnicalLossesPct)"
        :trend-text="`${formatEnergyKwh(dashboard.kpis.nonTechnicalLossesKwh)} no facturados`"
        :trend-type="dashboard.kpis.nonTechnicalLossesPct > 10 ? 'negative' : 'positive'"
        color="orange"
      >
        <template #icon>
          <IconTrendingDown :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Valor facturado"
        :value="formatCopCompact(dashboard.kpis.totalBilledCop)"
        trend-text="Facturación estimada del periodo"
        color="purple"
      >
        <template #icon>
          <IconCash :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Anomalías detectadas"
        :value="formatInteger(dashboard.kpis.detectedAnomalies)"
        trend-text="Casos priorizados para revisión"
        trend-type="negative"
        color="orange"
      >
        <template #icon>
          <IconAlertTriangle :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Consumo promedio"
        :value="formatEnergyKwh(dashboard.kpis.averageConsumptionKwh)"
        trend-text="Por cliente en el periodo"
        color="blue"
      >
        <template #icon>
          <IconActivity :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>
    </section>

    <EnergyCharts :dashboard="dashboard" />

    <EnergyCriticalZonesTable :zones="dashboard.criticalZones" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IconActivity,
  IconAlertTriangle,
  IconBolt,
  IconCash,
  IconFileSpreadsheet,
  IconTrendingDown,
  IconUsers,
} from '@tabler/icons-vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiMetricCard from '@/components/ui/UiMetricCard.vue';
import EnergyCharts from '@/components/features/energy/EnergyCharts.vue';
import EnergyCriticalZonesTable from '@/components/features/energy/EnergyCriticalZonesTable.vue';
import type { EnergyDashboard as EnergyDashboardModel } from '@/types/energy';
import { formatDateTime, formatDate } from '@/utils/date';
import {
  formatCopCompact,
  formatEnergyKwh,
  formatInteger,
  formatPercent,
} from '@/utils/number';

const props = defineProps<{
  dashboard: EnergyDashboardModel;
}>();

const periodRange = computed(() => {
  const from = props.dashboard.meta.periodFrom;
  const to = props.dashboard.meta.periodTo;
  if (!from && !to) return 'No informado';
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  return formatDate(from || to);
});
</script>

<style scoped>
.energy-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.result-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
  padding: var(--space-4) var(--space-5);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.result-file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.result-file-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background-color: var(--accent-green-bg);
  color: var(--accent-green);
}

.result-file-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.result-file-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 42ch;
}

.result-file-date {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.result-meta {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.meta-value {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .result-summary {
    align-items: flex-start;
  }

  .result-meta {
    gap: var(--space-4);
  }

  .result-file-name {
    max-width: 100%;
  }
}
</style>
