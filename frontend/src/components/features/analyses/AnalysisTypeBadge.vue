<template>
  <UiBadge :variant="isEnergy ? 'info' : 'neutral'" size="sm">
    <IconBolt v-if="isEnergy" :size="12" stroke-width="2" aria-hidden="true" />
    <IconChartHistogram v-else :size="12" stroke-width="2" aria-hidden="true" />
    {{ label }}
  </UiBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IconBolt, IconChartHistogram } from '@tabler/icons-vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import { analysisTypeLabel } from '@/types/analysis';

const props = defineProps<{
  type: string;
}>();

const isEnergy = computed(() => props.type === 'energy');
const label = computed(() => analysisTypeLabel(props.type));
</script>
