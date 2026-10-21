<template>
  <div class="energy-dashboard">
    <section class="primary-metrics" aria-label="Indicadores principales">
      <UiMetricCard
        title="Pérdidas no técnicas"
        :value="formatPercent(dashboard.kpis.nonTechnicalLossesPct)"
        :trend-text="`${formatEnergyKwh(dashboard.kpis.nonTechnicalLossesKwh)} no facturados`"
        :trend-type="lossTrendType"
        color="orange"
      >
        <template #icon>
          <IconTrendingDown :size="20" stroke-width="2" />
        </template>
      </UiMetricCard>

      <UiMetricCard
        title="Anomalías detectadas"
        :value="formatInteger(dashboard.kpis.detectedAnomalies)"
        :trend-text="anomalyTrendText"
        :trend-type="anomalyTrendType"
        color="orange"
      >
        <template #icon>
          <IconAlertTriangle :size="20" stroke-width="2" />
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
    </section>

    <section class="secondary-metrics" aria-label="Indicadores complementarios">
      <div class="secondary-metric">
        <IconUsers :size="18" stroke-width="1.8" />
        <div>
          <span>Clientes facturados</span>
          <strong>{{ formatInteger(dashboard.kpis.totalClients) }}</strong>
        </div>
      </div>
      <div class="secondary-metric">
        <IconBolt :size="18" stroke-width="1.8" />
        <div>
          <span>Consumo total</span>
          <strong>{{ formatEnergyKwh(dashboard.kpis.totalConsumptionKwh) }}</strong>
        </div>
      </div>
      <div class="secondary-metric">
        <IconActivity :size="18" stroke-width="1.8" />
        <div>
          <span>Consumo promedio</span>
          <strong>{{ formatEnergyKwh(dashboard.kpis.averageConsumptionKwh) }}</strong>
        </div>
      </div>
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
  IconTrendingDown,
  IconUsers,
} from '@tabler/icons-vue';
import UiMetricCard from '@/components/ui/UiMetricCard.vue';
import EnergyCharts from '@/components/features/energy/EnergyCharts.vue';
import EnergyCriticalZonesTable from '@/components/features/energy/EnergyCriticalZonesTable.vue';
import type { EnergyDashboard as EnergyDashboardModel } from '@/types/energy';
import {
  formatCopCompact,
  formatEnergyKwh,
  formatInteger,
  formatPercent,
} from '@/utils/number';

const props = defineProps<{
  dashboard: EnergyDashboardModel;
}>();

const lossTrendType = computed(() =>
  props.dashboard.kpis.nonTechnicalLossesPct > 10 ? 'negative' : 'positive',
);

const anomalyTrendType = computed(() =>
  props.dashboard.kpis.detectedAnomalies > 0 ? 'negative' : 'neutral',
);

const anomalyTrendText = computed(() =>
  props.dashboard.kpis.detectedAnomalies > 0
    ? 'Casos priorizados para revisión'
    : 'Sin casos detectados',
);
</script>

<style scoped>
.energy-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.primary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.secondary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.secondary-metric {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  color: var(--text-muted);
}

.secondary-metric + .secondary-metric {
  padding-left: var(--space-4);
  border-left: 1px solid var(--border);
}

.secondary-metric div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.secondary-metric span {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.secondary-metric strong {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .primary-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .secondary-metrics {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .secondary-metric + .secondary-metric {
    padding-top: var(--space-3);
    padding-left: 0;
    border-top: 1px solid var(--border);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .primary-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
