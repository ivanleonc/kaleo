<template>
  <AuthenticatedLayout>
    <div class="analysis-detail-container">
      <router-link :to="companyPath('/analyses')" class="back-link">
        <IconArrowLeft :size="16" stroke-width="1.8" />
        Volver a Analítica
      </router-link>

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
          <UiButton
            v-permission="Permissions.ANALYSES.DELETE"
            variant="danger"
            width="auto"
            @click="openDeleteModal"
          >
            <IconTrash :size="16" /> Eliminar
          </UiButton>
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
        <section class="analysis-overview" aria-label="Datos del análisis">
          <div class="overview-file">
            <div class="overview-icon">
              <IconFileSpreadsheet :size="22" stroke-width="1.8" />
            </div>
            <div class="overview-file-text">
              <span class="overview-file-name" :title="analysis.file_name || undefined">
                {{ analysis.file_name || 'Sin archivo' }}
              </span>
              <span class="overview-file-size">
                {{ analysis.file_size ? formatFileSize(analysis.file_size) : 'Tamaño no informado' }}
                · {{ formatDateTime(analysis.created_at) }}
              </span>
            </div>
          </div>

          <div class="overview-meta">
            <AnalysisTypeBadge :type="analysis.analysis_type" />
            <UiBadge
              v-if="analysis.source"
              :variant="analysis.source === 'mock' ? 'warning' : 'success'"
              size="sm"
            >
              {{ analysis.source === 'mock' ? 'Datos de demostración' : 'Datos de la API' }}
            </UiBadge>
            <span class="overview-author">
              Creado por {{ analysis.created_by_name || 'Usuario' }}
            </span>
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
              Este análisis fue guardado correctamente, pero todavía no existe un tablero para su tipo
              ({{ analysis.analysis_type }}).
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
  IconFileSpreadsheet,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import AnalysisTypeBadge from '@/components/features/analyses/AnalysisTypeBadge.vue';
import AnalysisRenameModal from '@/components/features/analyses/AnalysisRenameModal.vue';
import EnergyDashboard from '@/components/features/energy/EnergyDashboard.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useToast } from '@/composables/useToast';
import { Permissions } from '@/constants/permissions';
import type { Analysis, AnalysisDetail } from '@/types/analysis';
import {
  analysisTypeLabel,
  isEnergyResult,
} from '@/types/analysis';
import { formatDateTime } from '@/utils/date';
import { formatFileSize } from '@/utils/number';
import { apiErrorMessage } from '@/utils/error';

const route = useRoute();
const router = useRouter();
const analysisStore = useAnalysisStore();
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

const subtitle = computed(() => {
  if (!analysis.value) return 'Consulta el resultado guardado de tu análisis.';
  return `${analysisTypeLabel(analysis.value.analysis_type)} · ${analysis.value.file_name || 'Sin archivo'} · ${formatDateTime(analysis.value.created_at)}`;
});

const energyDashboard = computed(() => {
  if (!analysis.value || analysis.value.analysis_type !== 'energy') return null;
  return isEnergyResult(analysis.value.result) ? analysis.value.result : null;
});

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
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-decoration: none;
}

.back-link:hover {
  color: var(--text-main);
}

.analysis-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
  padding: var(--space-4) var(--space-5);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.overview-file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.overview-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background-color: var(--accent-green-bg);
  color: var(--accent-green);
}

.overview-file-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.overview-file-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-file-size {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.overview-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.overview-author {
  font-size: var(--text-xs);
  color: var(--text-muted);
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

@media (max-width: 640px) {
  .analysis-overview {
    align-items: flex-start;
  }

  .overview-meta {
    gap: var(--space-2);
  }
}
</style>
