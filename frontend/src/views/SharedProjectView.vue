<template>
  <div class="shared-page">
    <header class="shared-topbar">
      <div class="shared-brand">
        <span class="shared-brand-mark">{{ initials }}</span>
        <span>{{ payload?.company_name || 'Kaleo' }}</span>
      </div>
      <UiButton v-if="payload" size="sm" variant="outline" width="auto" @click="printPage">
        <IconPrinter :size="16" /> Imprimir / PDF
      </UiButton>
    </header>

    <main v-if="isLoading" class="shared-content" aria-hidden="true">
      <UiSkeleton variant="title" width="320px" />
      <UiSkeleton v-for="n in 6" :key="n" variant="text" width="100%" />
    </main>

    <main v-else-if="error" class="shared-content">
      <UiCard>
        <UiEmptyState
          title="Este enlace no está disponible"
          :description="error"
        >
          <template #icon><IconLinkOff :size="48" stroke-width="1.5" /></template>
        </UiEmptyState>
      </UiCard>
    </main>

    <main v-else-if="payload" class="shared-content">
      <section class="shared-hero">
        <div class="shared-hero-badges">
          <UiBadge :label="statusLabel(payload.project.status)" variant="success" />
          <UiBadge v-if="payload.project.category" :label="payload.project.category" />
          <UiBadge :label="payload.project.code" />
        </div>
        <h1>{{ payload.project.name }}</h1>
        <p v-if="payload.project.description" class="shared-description">
          {{ payload.project.description }}
        </p>
        <div class="shared-meta">
          <span v-if="payload.project.client_name">
            <IconUser :size="15" aria-hidden="true" /> {{ payload.project.client_name }}
          </span>
          <span v-if="payload.project.start_date">
            <IconCalendar :size="15" aria-hidden="true" />
            {{ formatDate(payload.project.start_date) }}
            → {{ payload.project.end_date ? formatDate(payload.project.end_date) : 'sin fin' }}
          </span>
        </div>
      </section>

      <div v-if="payload.budget" class="shared-metrics">
        <div class="shared-metric">
          <span>Total presupuesto</span>
          <strong>{{ formatMoney(payload.budget.total, payload.budget.currency_code) }}</strong>
        </div>
        <div class="shared-metric">
          <span>Costo directo</span>
          <strong>{{ formatMoney(payload.budget.subtotal, payload.budget.currency_code) }}</strong>
        </div>
        <div class="shared-metric">
          <span>Indirectos</span>
          <strong>{{ formatMoney(payload.budget.indirect_total, payload.budget.currency_code) }}</strong>
        </div>
      </div>

      <UiCard v-if="payload.budget">
        <div class="shared-budget-head">
          <div>
            <h2>{{ payload.budget.name }}</h2>
            <p>
              Versión v{{ payload.budget.version }}
              <template v-if="payload.budget.label"> · {{ payload.budget.label }}</template>
              · {{ budgetStatusLabel(payload.budget.status) }}
            </p>
          </div>
          <span v-if="payload.budget.approved_at" class="shared-approved">
            Aprobado {{ formatDate(payload.budget.approved_at) }}
          </span>
        </div>

        <div v-if="payload.budget.items?.length" class="shared-table">
          <div class="shared-table-head">
            <span>Código</span>
            <span>Actividad</span>
            <span>Unidad</span>
            <span>Cantidad</span>
            <span>Valor unitario</span>
            <span>Valor parcial</span>
          </div>
          <div
            v-for="item in payload.budget.items"
            :key="item.code"
            class="shared-table-row"
            :class="{ 'is-chapter': item.item_type === 'chapter' }"
          >
            <span class="shared-code">{{ item.code }}</span>
            <span>{{ item.name }}</span>
            <span>{{ item.unit_code || '' }}</span>
            <span class="shared-amount">
              {{ item.item_type === 'activity' ? formatNumber(item.quantity, 4) : '' }}
            </span>
            <span class="shared-amount">
              {{ formatMoney(item.unit_price, payload.budget.currency_code) }}
            </span>
            <span class="shared-amount">
              {{ formatMoney(item.partial_amount, payload.budget.currency_code) }}
            </span>
          </div>
          <div class="shared-table-row is-total">
            <span></span>
            <span>Total</span>
            <span></span>
            <span></span>
            <span></span>
            <span class="shared-amount">
              {{ formatMoney(payload.budget.total, payload.budget.currency_code) }}
            </span>
          </div>
        </div>
        <p v-else class="shared-note">
          Este enlace muestra el resumen del presupuesto. Solicita un enlace con alcance de
          presupuesto para ver el detalle de actividades.
        </p>
      </UiCard>

      <p class="shared-footer">
        Compartido por {{ payload.company_name }} · Enlace público de solo lectura.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import UiButton from '@/components/ui/UiButton.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import { IconCalendar, IconLinkOff, IconPrinter, IconUser } from '@tabler/icons-vue';
import { shareService } from '@/services/share.service';
import { apiErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import type { SharedProjectPayload } from '@/types/project-share';

const route = useRoute();
const token = computed(() => String(route.params.token ?? ''));
const payload = ref<SharedProjectPayload | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const initials = computed(() => {
  const name = payload.value?.company_name ?? 'Kaleo';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
});

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number, currency = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

function statusLabel(status: string): string {
  return {
    draft: 'Borrador',
    active: 'Activo',
    on_hold: 'En pausa',
    completed: 'Completado',
    cancelled: 'Cancelado',
  }[status] ?? status;
}

function budgetStatusLabel(status: string): string {
  return {
    draft: 'Borrador',
    in_review: 'En revisión',
    approved: 'Aprobado',
    superseded: 'Reemplazado',
  }[status] ?? status;
}

function printPage(): void {
  window.print();
}

onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    payload.value = await shareService.resolvePublic(token.value);
  } catch (err) {
    error.value = apiErrorMessage(
      err,
      'El enlace es inválido, expiró o fue revocado por la empresa.',
    );
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.shared-page {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text-main);
}

.shared-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border);
  background: var(--bg-app);
}

.shared-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  font-size: var(--text-sm);
}

.shared-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: var(--text-xs);
}

.shared-content {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.shared-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(120deg, var(--primary-active), var(--bg-hover) 55%, var(--bg-app));
}

.shared-hero-badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.shared-hero h1 {
  margin: var(--space-2) 0 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}

.shared-description {
  margin: 0;
  max-width: 70ch;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.shared-meta {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.shared-meta span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.shared-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.shared-metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-app);
}

.shared-metric span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.shared-metric strong {
  font-size: var(--text-lg);
  font-variant-numeric: tabular-nums;
}

.shared-budget-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.shared-budget-head h2 {
  margin: 0;
  font-size: var(--text-base);
}

.shared-budget-head p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.shared-approved {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.shared-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.shared-table-head,
.shared-table-row {
  display: grid;
  grid-template-columns: 80px minmax(220px, 1fr) 60px 100px 130px 130px;
  gap: var(--space-2);
  align-items: center;
  min-width: 860px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.shared-table-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.shared-table-row {
  border-top: 1px solid var(--border);
}

.shared-table-row.is-chapter {
  background: var(--bg-hover);
  font-weight: 600;
}

.shared-table-row.is-total {
  font-weight: 700;
  border-top-width: 2px;
}

.shared-code {
  color: var(--text-muted);
}

.shared-amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shared-note {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.shared-footer {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

@media print {
  .shared-topbar {
    border-bottom: none;
    padding: 0;
  }

  .shared-topbar :deep(.ui-button) {
    display: none !important;
  }

  .shared-content {
    width: 100%;
    padding: 0;
  }

  .shared-hero {
    background: none;
    padding: 0;
  }
}

@media (max-width: 600px) {
  .shared-content {
    padding: var(--space-4) var(--space-3);
  }

  .shared-topbar {
    padding: var(--space-3);
  }
}
</style>
