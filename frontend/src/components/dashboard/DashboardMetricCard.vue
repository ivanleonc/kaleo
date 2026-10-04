<template>
  <!--
    DashboardMetricCard — Alias de UiMetricCard.

    Se mantiene por retrocompatibilidad con el import existente en DashboardView.
    Para módulos nuevos, importar directamente UiMetricCard desde ui/.

    @deprecated Usar UiMetricCard de '@/components/ui/UiMetricCard.vue'
  -->
  <UiMetricCard v-bind="$props">
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
  </UiMetricCard>
</template>

<script setup lang="ts">
import UiMetricCard from '@/components/ui/UiMetricCard.vue';

// Re-exporta las mismas props para que el template pueda usar v-bind="$props"
defineProps<{
  title: string;
  value: string | number;
  trendText?: string;
  trendType?: 'positive' | 'neutral' | 'negative';
  color?: 'purple' | 'blue' | 'green' | 'orange';
  isText?: boolean;
  loading?: boolean;
}>();
</script>
