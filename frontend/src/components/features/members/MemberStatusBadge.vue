<template>
  <div class="status-cell">
    <UiBadge :variant="statusVariant" size="sm">
      {{ statusLabel }}
    </UiBadge>
    <UiBadge
      v-if="mustChangePassword"
      variant="warning"
      size="sm"
      title="Aún usa contraseña temporal: no ha completado el cambio"
    >
      Temporal
    </UiBadge>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import type { BadgeVariant } from '@/types/ui';

const props = defineProps<{
  status?: string;
  mustChangePassword?: boolean;
}>();

const statusLabel = computed(() => {
  if (props.status === 'inactive') return 'Inactivo';
  if (props.status === 'pending') return 'Pendiente';
  return 'Activo';
});

const statusVariant = computed((): BadgeVariant => {
  if (props.status === 'inactive') return 'danger';
  if (props.status === 'pending') return 'warning';
  return 'success';
});
</script>

<style scoped>
.status-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
