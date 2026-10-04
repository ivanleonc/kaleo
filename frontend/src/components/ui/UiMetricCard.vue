<template>
  <!--
    UiMetricCard — Tarjeta de métrica para dashboards.

    Movida desde components/dashboard/DashboardMetricCard.vue al sistema Ui*
    para que cualquier módulo pueda crear dashboards de métricas sin importar
    desde un directorio de features.

    Retrocompatibilidad: DashboardMetricCard.vue re-exporta este componente
    para no romper el import existente en DashboardView.

    Slots:
      - #icon: el ícono de Tabler u otro elemento visual a la izquierda del título

    Props nuevas respecto a DashboardMetricCard:
      - loading: muestra un skeleton mientras los datos cargan
  -->
  <div class="metric-card">
    <!-- Skeleton de carga -->
    <template v-if="loading">
      <div class="metric-header">
        <div class="metric-icon-skeleton" aria-hidden="true"></div>
        <div class="metric-title-skeleton" aria-hidden="true"></div>
      </div>
      <div class="metric-value-skeleton" aria-hidden="true"></div>
    </template>

    <template v-else>
      <div class="metric-header">
        <div :class="['metric-icon', `icon-${color}`]">
          <slot name="icon"></slot>
        </div>
        <span class="metric-title">{{ title }}</span>
      </div>
      <div class="metric-value" :class="{ 'text-ellipsis': isText }">{{ value }}</div>
      <div v-if="trendText" class="metric-trend">
        <span :class="trendClass">{{ trendText }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Tarjeta de métrica reutilizable para cualquier dashboard del sistema.
 *
 * Uso básico:
 * ```html
 * <UiMetricCard
 *   title="Miembros Activos"
 *   :value="42"
 *   trend-text="+3 este mes"
 *   trend-type="positive"
 *   color="blue"
 *   :loading="isLoading"
 * >
 *   <template #icon><IconUsers :size="18" /></template>
 * </UiMetricCard>
 * ```
 */
const props = withDefaults(defineProps<{
  /** Título de la métrica (ej. "Miembros Activos"). */
  title: string;
  /** Valor principal a mostrar en grande. */
  value: string | number;
  /** Texto de tendencia debajo del valor (ej. "+3 este mes"). */
  trendText?: string;
  /** Tipo de tendencia: afecta el color del texto. */
  trendType?: 'positive' | 'neutral' | 'negative';
  /** Color del fondo del ícono. */
  color?: 'purple' | 'blue' | 'green' | 'orange';
  /** Si el valor es texto largo, activa ellipsis y reduce el font-size. */
  isText?: boolean;
  /** Muestra un skeleton mientras los datos cargan. */
  loading?: boolean;
}>(), {
  color: 'purple',
  trendType: 'neutral',
  loading: false,
});

const trendClass = computed(() => {
  if (props.trendType === 'positive') return 'trend-positive';
  if (props.trendType === 'negative') return 'trend-negative';
  return 'trend-neutral';
});
</script>

<style scoped>
.metric-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.metric-card:hover {
  border-color: var(--text-light);
  box-shadow: var(--shadow-sm);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-purple { background-color: var(--accent-purple-bg); color: var(--accent-purple); }
.icon-blue   { background-color: var(--accent-blue-bg);   color: var(--accent-blue);   }
.icon-green  { background-color: var(--accent-green-bg);  color: var(--accent-green);  }
.icon-orange { background-color: var(--accent-orange-bg); color: var(--accent-orange); }

.metric-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
  letter-spacing: -0.025em;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-lg);
}

.metric-trend {
  font-size: var(--text-xs);
  font-weight: 500;
}

.trend-positive { color: var(--color-success); }
.trend-negative { color: var(--color-danger); }
.trend-neutral  { color: var(--text-muted); }

/* Skeletons de carga */
.metric-icon-skeleton {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  background: var(--bg-hover);
  flex-shrink: 0;
}
.metric-title-skeleton {
  height: 14px;
  width: 100px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}
.metric-value-skeleton {
  height: 28px;
  width: 60px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}
</style>
