<template>
  <UiSelect
    v-model="model"
    :label="label"
    :placeholder="placeholder"
    :options="timezoneOptions"
    :required="required"
    :disabled="disabled"
    :error="error"
    :aria-label="ariaLabel"
    search-placeholder="Buscar zona horaria..."
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import type { UiSelectOption } from '@/types/ui';

/**
 * Selector de zona horaria con lista curada de zonas IANA.
 *
 * Reemplaza los inputs de texto libre en Sedes y Ajustes, donde un typo
 * ("Bogota", "UTC+5") se guardaba en silencio y rompía el formateo de fechas.
 * La lista cubre todas las Américas + UTC + principales europeas/asiáticas.
 * Si el valor actual no está en la lista (dato legacy), se agrega al inicio
 * para no perderlo.
 */
interface Props {
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  label: 'Zona horaria',
  placeholder: 'Seleccionar zona horaria...',
  required: false,
  disabled: false,
  error: null,
});

const model = defineModel<string>({ default: '' });

const CURATED_TIMEZONES: UiSelectOption[] = [
  { label: 'UTC (Tiempo universal)', value: 'UTC', group: 'Global' },
  { label: 'Ciudad de México (GMT-6)', value: 'America/Mexico_City', group: 'Norteamérica' },
  { label: 'Nueva York (GMT-5/-4)', value: 'America/New_York', group: 'Norteamérica' },
  { label: 'Chicago (GMT-6/-5)', value: 'America/Chicago', group: 'Norteamérica' },
  { label: 'Denver (GMT-7/-6)', value: 'America/Denver', group: 'Norteamérica' },
  { label: 'Los Ángeles (GMT-8/-7)', value: 'America/Los_Angeles', group: 'Norteamérica' },
  { label: 'Guatemala (GMT-6)', value: 'America/Guatemala', group: 'Centroamérica y Caribe' },
  {
    label: 'San José, Costa Rica (GMT-6)',
    value: 'America/Costa_Rica',
    group: 'Centroamérica y Caribe',
  },
  { label: 'Panamá (GMT-5)', value: 'America/Panama', group: 'Centroamérica y Caribe' },
  { label: 'La Habana (GMT-5/-4)', value: 'America/Havana', group: 'Centroamérica y Caribe' },
  {
    label: 'Santo Domingo (GMT-4)',
    value: 'America/Santo_Domingo',
    group: 'Centroamérica y Caribe',
  },
  { label: 'Bogotá / Lima (GMT-5)', value: 'America/Bogota', group: 'Sudamérica' },
  { label: 'Quito (GMT-5)', value: 'America/Guayaquil', group: 'Sudamérica' },
  { label: 'La Paz (GMT-4)', value: 'America/La_Paz', group: 'Sudamérica' },
  { label: 'Caracas (GMT-4)', value: 'America/Caracas', group: 'Sudamérica' },
  { label: 'Santiago (GMT-4/-3)', value: 'America/Santiago', group: 'Sudamérica' },
  {
    label: 'Buenos Aires (GMT-3)',
    value: 'America/Argentina/Buenos_Aires',
    group: 'Sudamérica',
  },
  { label: 'São Paulo (GMT-3)', value: 'America/Sao_Paulo', group: 'Sudamérica' },
  { label: 'Montevideo (GMT-3)', value: 'America/Montevideo', group: 'Sudamérica' },
  { label: 'Asunción (GMT-4/-3)', value: 'America/Asuncion', group: 'Sudamérica' },
  { label: 'Madrid (GMT+1/+2)', value: 'Europe/Madrid', group: 'Europa' },
  { label: 'Londres (GMT+0/+1)', value: 'Europe/London', group: 'Europa' },
  { label: 'París / Berlín (GMT+1/+2)', value: 'Europe/Paris', group: 'Europa' },
  { label: 'Lisboa (GMT+0/+1)', value: 'Europe/Lisbon', group: 'Europa' },
  { label: 'Dubái (GMT+4)', value: 'Asia/Dubai', group: 'Asia y Oceanía' },
  { label: 'Nueva Delhi (GMT+5:30)', value: 'Asia/Kolkata', group: 'Asia y Oceanía' },
  { label: 'Singapur (GMT+8)', value: 'Asia/Singapore', group: 'Asia y Oceanía' },
  { label: 'Tokio (GMT+9)', value: 'Asia/Tokyo', group: 'Asia y Oceanía' },
  { label: 'Sídney (GMT+10/+11)', value: 'Australia/Sydney', group: 'Asia y Oceanía' },
  { label: 'Auckland (GMT+12/+13)', value: 'Pacific/Auckland', group: 'Asia y Oceanía' },
];

const timezoneOptions = computed<UiSelectOption[]>(() => {
  const current = model.value?.trim();
  if (!current) return CURATED_TIMEZONES;
  if (CURATED_TIMEZONES.some((timezone) => timezone.value === current)) {
    return CURATED_TIMEZONES;
  }
  return [
    { label: `${current} (personalizada)`, value: current, group: 'Personalizada' },
    ...CURATED_TIMEZONES,
  ];
});

defineExpose({ timezoneOptions });
</script>
