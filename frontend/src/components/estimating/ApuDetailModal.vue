<template>
  <UiFormModal
    :model-value="modelValue"
    :title="apu ? `${apu.code} · ${apu.name}` : 'Detalle de APU'"
    size="large"
    :hide-footer="true"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="isLoading" class="apu-loading" aria-hidden="true">
      <UiSkeleton variant="title" width="220px" />
      <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
    </div>

    <UiAlert v-else-if="error" type="error">{{ error }}</UiAlert>

    <template v-else-if="apu">
      <div class="apu-summary">
        <div>
          <p class="apu-meta">{{ apu.base_name }} · {{ apu.unit_code }} · {{ apu.lines_count }} insumos</p>
          <p class="apu-meta">Costo unitario: {{ formatMoney(apu.unit_cost, currencyCode) }}</p>
        </div>
        <div class="apu-badges">
          <UiBadge :label="`v${apu.current_version_number ?? 1}`" />
          <UiBadge
            :label="apu.current_version_status === 'approved' ? 'Aprobado' : 'Borrador'"
            :variant="apu.current_version_status === 'approved' ? 'success' : 'warning'"
          />
        </div>
      </div>

      <section v-for="group in groups" :key="group.type" class="apu-group">
        <h4>
          {{ group.label }}
          <span>{{ formatMoney(group.total, currencyCode) }}</span>
        </h4>
        <div class="apu-lines">
          <div class="apu-line-head">
            <span>Código</span>
            <span>Insumo</span>
            <span>Unidad</span>
            <span>Cantidad</span>
            <span>Desperdicio</span>
            <span>Rendimiento</span>
            <span>Valor unitario</span>
            <span>Parcial</span>
          </div>
          <div v-for="line in group.lines" :key="line.id" class="apu-line">
            <span>{{ line.resource_code }}</span>
            <span>{{ line.resource_name }}</span>
            <span>{{ line.unit_code }}</span>
            <span>{{ formatNumber(line.quantity, 4) }}</span>
            <span>{{ formatNumber(line.waste_pct, 2) }}%</span>
            <span>{{ formatNumber(line.performance, 2) }}</span>
            <span>{{ formatMoney(line.unit_cost_snapshot, line.currency_code) }}</span>
            <span>{{ formatMoney(line.partial_amount, line.currency_code) }}</span>
          </div>
          <p v-if="group.lines.length === 0" class="apu-empty">Sin insumos en este grupo.</p>
        </div>
      </section>

      <div class="apu-total">
        <span>Total APU</span>
        <strong>{{ formatMoney(apu.unit_cost, currencyCode) }}</strong>
      </div>
    </template>
  </UiFormModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import { estimatingService } from '@/services/estimating.service';
import { apiErrorMessage } from '@/utils/error';
import type { ApuDetail, ResourceType } from '@/types/estimating';

const props = defineProps<{
  modelValue: boolean;
  apuId: string | null;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const apu = ref<ApuDetail | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const GROUPS: Array<{ type: ResourceType; label: string }> = [
  { type: 'equipment', label: 'Equipos' },
  { type: 'material', label: 'Materiales' },
  { type: 'labor', label: 'Mano de obra' },
  { type: 'transport', label: 'Transportes' },
  { type: 'subcontract', label: 'Subcontratos' },
];

const currencyCode = computed(() => apu.value?.lines[0]?.currency_code ?? 'COP');

const groups = computed(() =>
  GROUPS.map((group) => {
    const lines = (apu.value?.lines ?? []).filter(
      (line) => line.component_type === group.type,
    );
    return {
      ...group,
      lines,
      total: lines.reduce((sum, line) => sum + line.partial_amount, 0),
    };
  }).filter((group) => group.lines.length > 0),
);

watch(
  () => [props.modelValue, props.apuId] as const,
  async ([open, id]) => {
    if (!open || !id) return;
    isLoading.value = true;
    error.value = null;
    try {
      apu.value = await estimatingService.getApu(id);
    } catch (err) {
      error.value = apiErrorMessage(err, 'No pudimos cargar el APU');
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true },
);

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number, currency = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}
</script>

<style scoped>
.apu-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.apu-summary {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.apu-meta {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.apu-badges {
  display: flex;
  gap: var(--space-2);
}

.apu-group {
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.apu-group h4 {
  display: flex;
  justify-content: space-between;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
}

.apu-group h4 span {
  color: var(--text-muted);
  font-weight: 500;
}

.apu-lines {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.apu-line-head,
.apu-line {
  display: grid;
  grid-template-columns: 90px minmax(180px, 1fr) 60px 80px 80px 90px 110px 110px;
  gap: var(--space-2);
  align-items: center;
  min-width: 850px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.apu-line-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.apu-line {
  color: var(--text-main);
  border-top: 1px solid var(--border);
}

.apu-empty {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-light);
}

.apu-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid var(--border);
  padding-top: var(--space-3);
  font-size: var(--text-base);
}
</style>
