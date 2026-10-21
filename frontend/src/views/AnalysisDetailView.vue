<template>
  <AuthenticatedLayout>
    <div class="analysis-detail-container">
      <button type="button" class="back-link" @click="goBackToList">
        <IconArrowLeft :size="16" stroke-width="1.8" />
        Volver a Analítica
      </button>

      <UiPageHeader
        :title="analysis?.name || 'Análisis'"
        :subtitle="subtitle"
      >
        <template v-if="analysis" #actions>
          <UiButton
            v-permission="Permissions.ANALYSES.CREATE"
            variant="outline"
            width="auto"
            @click="openNewAnalysis"
          >
            <IconPlus :size="16" /> Nuevo análisis
          </UiButton>
          <UiButton
            v-permission="Permissions.ANALYSES.UPDATE"
            variant="outline"
            width="auto"
            @click="isRenameModalOpen = true"
          >
            <IconPencil :size="16" /> Renombrar
          </UiButton>
          <UiDropdown label="Más acciones del análisis">
            <template #trigger="{ toggle, triggerAria }">
              <button
                class="more-actions-btn"
                type="button"
                aria-label="Más acciones del análisis"
                @click="toggle"
                v-bind="triggerAria"
              >
                <IconDotsVertical :size="18" stroke-width="1.8" />
              </button>
            </template>
            <template #default>
              <UiDropdownItem @click="copyLink">
                <IconLink :size="14" stroke-width="1.8" />
                <span>Copiar enlace</span>
              </UiDropdownItem>
              <UiDropdownItem
                v-if="energyDashboard?.criticalZones.length"
                @click="exportCriticalZonesCsv"
              >
                <IconDownload :size="14" stroke-width="1.8" />
                <span>Exportar zonas en CSV</span>
              </UiDropdownItem>
              <UiDropdownItem @click="printAnalysis">
                <IconPrinter :size="14" stroke-width="1.8" />
                <span>Imprimir o guardar PDF</span>
              </UiDropdownItem>
              <template v-if="canDelete">
                <div class="ui-dropdown-divider" role="separator"></div>
                <UiDropdownItem danger @click="openDeleteModal">
                  <IconTrash :size="14" stroke-width="1.8" />
                  <span>Eliminar análisis</span>
                </UiDropdownItem>
              </template>
            </template>
          </UiDropdown>
        </template>
      </UiPageHeader>

      <div v-if="isLoading && !analysis" class="detail-loading" role="status" aria-live="polite">
        <span class="sr-only">Cargando análisis…</span>
        <div class="skeleton skeleton-line skeleton-title"></div>
        <div class="skeleton-card">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line skeleton-short"></div>
        </div>
        <div class="skeleton-grid">
          <div v-for="n in 6" :key="n" class="skeleton skeleton-card"></div>
        </div>
      </div>

      <UiErrorState
        v-else-if="error"
        title="No pudimos cargar el análisis"
        :description="error"
        @retry="loadAnalysis"
      />

      <template v-else-if="analysis">
        <section class="analysis-context" aria-label="Datos del análisis">
          <div class="context-file">
            <div class="context-icon">
              <IconFileSpreadsheet :size="22" stroke-width="1.8" />
            </div>
            <div class="context-file-text">
              <span class="context-file-name" :title="analysis.file_name || undefined">
                {{ analysis.file_name || 'Sin archivo' }}
              </span>
              <span class="context-file-meta">
                {{ analysis.file_size ? formatFileSize(analysis.file_size) : 'Tamaño no informado' }}
                · {{ formatDateTime(analysis.created_at) }}
              </span>
            </div>
          </div>

          <dl class="context-stats">
            <div v-if="energySummary || energyDashboard" class="context-stat">
              <dt>Periodo</dt>
              <dd>{{ periodRange }}</dd>
            </div>
            <div v-if="rowsProcessed !== null" class="context-stat">
              <dt>Registros</dt>
              <dd>{{ formatInteger(rowsProcessed) }}</dd>
            </div>
            <div class="context-stat">
              <dt>Autor</dt>
              <dd>{{ analysis.created_by_name || 'Usuario' }}</dd>
            </div>
          </dl>

          <div class="context-tags">
            <AnalysisTypeBadge :type="analysis.analysis_type" />
            <UiBadge
              v-if="analysis.source === 'mock'"
              variant="warning"
              size="sm"
            >
              Datos de ejemplo
            </UiBadge>
          </div>
        </section>

        <EnergyDashboard
          v-if="energyDashboard"
          :dashboard="energyDashboard"
        />

        <UiAlert v-else-if="analysis.analysis_type === 'energy'" type="warning">
          El resultado de este análisis no tiene el formato esperado para el tablero energético.
        </UiAlert>

        <section v-else class="unsupported-analysis">
          <div class="unsupported-icon">
            <IconChartHistogram :size="38" stroke-width="1.5" />
          </div>
          <div>
            <h2 class="unsupported-title">Visualización no disponible</h2>
            <p class="unsupported-text">
              Este análisis fue guardado correctamente, pero todavía no existe un tablero para este
              tipo de análisis.
            </p>
          </div>
        </section>
      </template>
    </div>

    <AnalysisRenameModal
      v-model="isRenameModalOpen"
      :analysis="analysis"
      @saved="handleRenamed"
    />

    <UiConfirmDialog
      v-model="isDeleteModalOpen"
      title="Eliminar análisis"
      :loading="analysisStore.isLoading"
      :error="analysisStore.error"
      confirm-label="Eliminar"
      @confirm="confirmDelete"
    >
      ¿Estás seguro de que deseas eliminar el análisis
      <strong>{{ analysis?.name }}</strong>? Esta acción no se puede deshacer.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IconArrowLeft,
  IconChartHistogram,
  IconDotsVertical,
  IconDownload,
  IconFileSpreadsheet,
  IconLink,
  IconPencil,
  IconPlus,
  IconPrinter,
  IconTrash,
} from '@tabler/icons-vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import AnalysisTypeBadge from '@/components/features/analyses/AnalysisTypeBadge.vue';
import AnalysisRenameModal from '@/components/features/analyses/AnalysisRenameModal.vue';
import EnergyDashboard from '@/components/features/energy/EnergyDashboard.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useToast } from '@/composables/useToast';
import { Permissions } from '@/constants/permissions';
import type { Analysis, AnalysisDetail } from '@/types/analysis';
import {
  energySummaryOf,
  isEnergyResult,
} from '@/types/analysis';
import type { EnergyZoneStatus } from '@/types/energy';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatFileSize, formatInteger } from '@/utils/number';
import { apiErrorMessage } from '@/utils/error';

const route = useRoute();
const router = useRouter();
const analysisStore = useAnalysisStore();
const authStore = useAuthStore();
const toast = useToast();
const { companyId, companyPath } = useCompanyPath();

const analysis = ref<AnalysisDetail | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isRenameModalOpen = ref(false);
const isDeleteModalOpen = ref(false);

const analysisId = computed(() =>
  typeof route.params.analysisId === 'string' ? route.params.analysisId : '',
);

const subtitle = computed(() =>
  analysis.value
    ? 'Consulta los indicadores y zonas críticas del periodo.'
    : 'Cargando el resultado guardado de tu análisis.',
);

const energyDashboard = computed(() => {
  if (!analysis.value || analysis.value.analysis_type !== 'energy') return null;
  return isEnergyResult(analysis.value.result) ? analysis.value.result : null;
});

const energySummary = computed(() =>
  analysis.value ? energySummaryOf(analysis.value.summary) : null,
);

const rowsProcessed = computed(
  () => energySummary.value?.rowsProcessed ?? energyDashboard.value?.meta.rowsProcessed ?? null,
);

const periodRange = computed(() => {
  const from = energySummary.value?.periodFrom ?? energyDashboard.value?.meta.periodFrom;
  const to = energySummary.value?.periodTo ?? energyDashboard.value?.meta.periodTo;
  if (!from && !to) return 'No informado';
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  return formatDate(from || to || '');
});

const canDelete = computed(() => authStore.hasPermission(Permissions.ANALYSES.DELETE));

async function loadAnalysis() {
  if (!analysisId.value) return;

  isLoading.value = true;
  error.value = null;
  analysisStore.error = null;
  try {
    analysis.value = await analysisStore.fetchAnalysis(analysisId.value);
  } catch (err: unknown) {
    error.value = apiErrorMessage(err, 'No pudimos cargar el análisis');
  } finally {
    isLoading.value = false;
  }
}

watch([analysisId, companyId], ([id, currentCompanyId], [previousId, previousCompanyId]) => {
  if (!id) return;
  if (id !== previousId || currentCompanyId !== previousCompanyId) loadAnalysis();
});

function goBackToList() {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push(companyPath('/analyses'));
}

function openNewAnalysis() {
  router.push({ path: companyPath('/analyses'), query: { crear: '1' } });
}

function handleRenamed(updated: Analysis) {
  if (analysis.value) {
    analysis.value = { ...analysis.value, ...updated };
  }
  isRenameModalOpen.value = false;
}

function openDeleteModal() {
  analysisStore.error = null;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!analysis.value) return;
  try {
    await analysisStore.deleteAnalysis(analysis.value.id);
    isDeleteModalOpen.value = false;
    toast.success('Análisis eliminado correctamente');
    router.push(companyPath('/analyses'));
  } catch {
    isDeleteModalOpen.value = true;
  }
}

async function copyLink() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
    } else {
      const field = document.createElement('textarea');
      field.value = window.location.href;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('No se pudo copiar');
    }
    toast.success('Enlace copiado');
  } catch {
    toast.error('No pudimos copiar el enlace');
  }
}

const ZONE_STATUS_LABELS: Record<EnergyZoneStatus, string> = {
  critical: 'Crítica',
  warning: 'En observación',
  normal: 'Normal',
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCriticalZonesCsv() {
  const zones = energyDashboard.value?.criticalZones ?? [];
  if (!zones.length) {
    toast.warning('Este análisis no tiene zonas críticas para exportar');
    return;
  }

  const rows = [
    ['Zona', 'Municipio', 'Clientes', 'Consumo kWh', 'Pérdidas kWh', '% Pérdida', 'Estado'],
    ...zones.map((zone) => [
      zone.zone,
      zone.municipality,
      zone.clients,
      zone.consumptionKwh,
      zone.lossesKwh,
      zone.lossesPct,
      ZONE_STATUS_LABELS[zone.status] ?? zone.status,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const baseName = (analysis.value?.name || 'analisis')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  link.href = url;
  link.download = `${baseName || 'analisis'}-zonas-criticas.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printAnalysis() {
  window.print();
}

onMounted(loadAnalysis);
</script>

<style scoped>
.analysis-detail-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: fit-content;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.back-link:hover {
  color: var(--text-main);
}

.back-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.more-actions-btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.more-actions-btn:hover {
  background-color: var(--bg-hover);
  border-color: var(--text-light);
  color: var(--text-main);
}

.more-actions-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.analysis-context {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) auto auto;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-5);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.context-file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.context-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background-color: var(--accent-green-bg);
  color: var(--accent-green);
}

.context-file-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.context-file-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-file-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.context-stats {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  margin: 0;
}

.context-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.context-stat dt {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.context-stat dd {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.context-tags {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.unsupported-analysis {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-6);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.unsupported-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  color: var(--text-muted);
}

.unsupported-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.unsupported-text {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.detail-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}

.skeleton-card {
  min-height: 96px;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

.skeleton-title {
  width: 240px;
  height: 24px;
}

.skeleton-short {
  width: 60%;
}

@media (max-width: 960px) {
  .analysis-context {
    grid-template-columns: 1fr;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .context-tags {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .context-stats {
    width: 100%;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .context-file-name {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media (pointer: coarse) {
  .more-actions-btn {
    width: 44px;
    height: 44px;
  }
}

@media print {
  .back-link {
    display: none;
  }

  .analysis-context {
    box-shadow: none;
  }
}
</style>
