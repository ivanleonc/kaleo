<template>
  <UiCard>
    <template #header>
      <h2 class="section-title">Zonas con mayor pérdida</h2>
      <p class="section-subtitle">
        Circuitos priorizados por porcentaje de pérdidas no técnicas.
      </p>
    </template>

    <UiEmptyState
      v-if="zones.length === 0"
      title="Sin zonas críticas"
      description="La API no reportó zonas para el periodo analizado."
    >
      <template #icon>
        <IconMapPinOff :size="44" stroke-width="1.5" />
      </template>
    </UiEmptyState>

    <div v-else class="table-wrap">
      <table class="ui-table">
        <caption class="sr-only">
          Zonas con mayor porcentaje de pérdidas no técnicas
        </caption>
        <thead>
          <tr>
            <th scope="col">Zona</th>
            <th scope="col" class="align-right">Clientes</th>
            <th scope="col" class="align-right">Consumo</th>
            <th scope="col" class="align-right">Pérdidas</th>
            <th scope="col" class="align-right">% Pérdida</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="zone in zones" :key="zone.id">
            <td data-label="Zona">
              <div class="zone-cell">
                <span class="zone-name">{{ zone.zone }}</span>
                <span class="zone-municipality">{{ zone.municipality }}</span>
              </div>
            </td>
            <td data-label="Clientes" class="align-right">
              {{ formatInteger(zone.clients) }}
            </td>
            <td data-label="Consumo" class="align-right">
              {{ formatEnergyKwh(zone.consumptionKwh) }}
            </td>
            <td data-label="Pérdidas" class="align-right">
              {{ formatEnergyKwh(zone.lossesKwh) }}
            </td>
            <td data-label="% Pérdida" class="align-right">
              <strong>{{ formatPercent(zone.lossesPct) }}</strong>
            </td>
            <td data-label="Estado">
              <UiBadge
                size="sm"
                :variant="statusVariant(zone.status)"
                :label="statusLabel(zone.status)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { IconMapPinOff } from '@tabler/icons-vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import type { EnergyCriticalZone, EnergyZoneStatus } from '@/types/energy';
import { formatEnergyKwh, formatInteger, formatPercent } from '@/utils/number';

defineProps<{
  zones: EnergyCriticalZone[];
}>();

function statusVariant(status: EnergyZoneStatus): 'danger' | 'warning' | 'success' {
  if (status === 'critical') return 'danger';
  if (status === 'warning') return 'warning';
  return 'success';
}

function statusLabel(status: EnergyZoneStatus): string {
  if (status === 'critical') return 'Crítica';
  if (status === 'warning') return 'En observación';
  return 'Normal';
}
</script>

<style scoped>
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

.table-wrap {
  overflow-x: auto;
}

.align-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.zone-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zone-name {
  font-weight: 500;
  color: var(--text-main);
}

.zone-municipality {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .align-right {
    text-align: left;
  }
}
</style>
