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
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiSelect from '@/components/ui/UiSelect.vue';

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

const props = withDefaults(defineProps<Props>(), {
  label: 'Zona horaria',
  placeholder: 'Seleccionar zona horaria...',
  required: false,
  disabled: false,
  error: null,
});

const model = defineModel<string>({ default: '' });

const CURATED_TIMEZONES: { label: string; value: string }[] = [
  { label: 'UTC (Tiempo universal)', value: 'UTC' },
  // Norteamérica
  { label: 'Ciudad de México (GMT-6)', value: 'America/Mexico_City' },
  { label: 'Bogotá / Lima (GMT-5)', value: 'America/Bogota' },
  { label: 'Nueva York (GMT-5/-4)', value: 'America/New_York' },
  { label: 'Chicago (GMT-6/-5)', value: 'America/Chicago' },
  { label: 'Denver (GMT-7/-6)', value: 'America/Denver' },
  { label: 'Los Ángeles (GMT-8/-7)', value: 'America/Los_Angeles' },
  // Centroamérica y Caribe
  { label: 'Guatemala (GMT-6)', value: 'America/Guatemala' },
  { label: 'San José, Costa Rica (GMT-6)', value: 'America/Costa_Rica' },
  { label: 'Panamá (GMT-5)', value: 'America/Panama' },
  { label: 'La Habana (GMT-5/-4)', value: 'America/Havana' },
  { label: 'Santo Domingo (GMT-4)', value: 'America/Santo_Domingo' },
  // Sudamérica
  { label: 'Caracas (GMT-4)', value: 'America/Caracas' },
  { label: 'Santiago (GMT-4/-3)', value: 'America/Santiago' },
  { label: 'Buenos Aires (GMT-3)', value: 'America/Argentina/Buenos_Aires' },
  { label: 'São Paulo (GMT-3)', value: 'America/Sao_Paulo' },
  { label: 'Montevideo (GMT-3)', value: 'America/Montevideo' },
  { label: 'Asunción (GMT-4/-3)', value: 'America/Asuncion' },
  { label: 'La Paz (GMT-4)', value: 'America/La_Paz' },
  { label: 'Quito (GMT-5)', value: 'America/Guayaquil' },
  // Europa
  { label: 'Madrid (GMT+1/+2)', value: 'Europe/Madrid' },
  { label: 'Londres (GMT+0/+1)', value: 'Europe/London' },
  { label: 'París / Berlín (GMT+1/+2)', value: 'Europe/Paris' },
  { label: 'Lisboa (GMT+0/+1)', value: 'Europe/Lisbon' },
  // Resto del mundo
  { label: 'Dubái (GMT+4)', value: 'Asia/Dubai' },
  { label: 'Nueva Delhi (GMT+5:30)', value: 'Asia/Kolkata' },
  { label: 'Singapur (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Tokio (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Sídney (GMT+10/+11)', value: 'Australia/Sydney' },
  { label: 'Auckland (GMT+12/+13)', value: 'Pacific/Auckland' },
];

const timezoneOptions = computed(() => {
  const current = model.value?.trim();
  if (!current) return CURATED_TIMEZONES;
  if (CURATED_TIMEZONES.some((t) => t.value === current)) return CURATED_TIMEZONES;
  // Dato legacy fuera de la lista: no perderlo, mostrarlo primero.
  return [{ label: `${current} (personalizada)`, value: current }, ...CURATED_TIMEZONES];
});

defineExpose({ timezoneOptions });
