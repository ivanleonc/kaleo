<template>
  <AuthenticatedLayout>
    <div class="analyses-container">
      <UiPageHeader
        title="Analítica"
        subtitle="Historial de análisis de tu empresa. Procesa un Excel y consulta sus resultados cuando quieras."
      >
        <template #actions>
          <UiButton
            v-permission="Permissions.ANALYSES.CREATE"
            width="auto"
            @click="openCreateModal"
          >
            <IconPlus :size="16" /> Nuevo análisis
          </UiButton>
        </template>
      </UiPageHeader>

      <UiTableFilters v-model="filterValues" :filters="filterDefs" />

      <div class="table-section">
        <AnalysisTable
          :table="analysisTable"
          :loading="isInitialLoading"
          :error="analysisStore.error"
          error-title="No pudimos cargar los análisis"
          :empty-title="analysisStore.analyses.length === 0 ? 'No hay análisis todavía' : 'Sin resultados'"
          :empty-description="analysisStore.analyses.length === 0
            ? 'Carga tu primer Excel para generar y guardar un análisis.'
            : 'Prueba con otra búsqueda o limpia los filtros.'"
          @retry="analysisStore.fetchAnalyses()"
          @view="openDetail"
          @rename="openRenameModal"
          @delete="openDeleteModal"
        >
          <template #empty-action>
            <UiButton
              v-if="analysisStore.analyses.length === 0"
              v-permission="Permissions.ANALYSES.CREATE"
              width="auto"
              @click="openCreateModal"
            >
              <IconPlus :size="16" /> Nuevo análisis
            </UiButton>
          </template>
        </AnalysisTable>
      </div>

      <UiPagination
        :page="analysisStore.page"
        :total="analysisStore.total"
        :limit="analysisStore.limit"
        show-page-size
        @update:page="analysisStore.goToPage"
        @update:limit="analysisStore.setLimit"
      />

      <AnalysisCreateModal
        v-model="isCreateModalOpen"
        @created="handleCreated"
        @view="openDetail"
      />

      <AnalysisRenameModal
        v-model="isRenameModalOpen"
        :analysis="renamingAnalysis"
        @saved="handleRenamed"
      />
    </div>

    <UiConfirmDialog
      v-model="isDeleteModalOpen"
      title="Eliminar análisis"
      :loading="analysisStore.isLoading"
      :error="analysisStore.error"
      confirm-label="Eliminar"
      @confirm="confirmDelete"
    >
      ¿Estás seguro de que deseas eliminar el análisis
      <strong>{{ deletingAnalysis?.name }}</strong>? Esta acción no se puede deshacer.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IconPlus } from '@tabler/icons-vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiTableFilters, { type TableFilterDef } from '@/components/ui/UiTableFilters.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import AnalysisTable from '@/components/features/analyses/AnalysisTable.vue';
import AnalysisCreateModal from '@/components/features/analyses/AnalysisCreateModal.vue';
import AnalysisRenameModal from '@/components/features/analyses/AnalysisRenameModal.vue';
import { useAnalysisStore } from '@/stores/analysis.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useCreateAction } from '@/composables/useCreateAction';
import { useFilterSync } from '@/composables/useFilterSync';
import { useTableView } from '@/composables/useTableView';
import { useToast } from '@/composables/useToast';
import { useAnalysisColumns } from '@/composables/useAnalysisColumns';
import { Permissions } from '@/constants/permissions';
import { ANALYSIS_TYPES, type Analysis } from '@/types/analysis';
import { emptyToUndefined } from '@/utils/text';

const router = useRouter();
const analysisStore = useAnalysisStore();
const toast = useToast();
const { companyId, companyPath } = useCompanyPath();

const filterValues = ref<Record<string, string>>({ search: '' });
const filterDefs = computed<TableFilterDef[]>(() => [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar análisis',
    placeholder: 'Buscar por nombre o archivo...',
    grow: true,
  },
  ...(ANALYSIS_TYPES.length > 1
    ? [{
        key: 'analysis_type',
        type: 'select' as const,
        label: 'Filtrar por tipo',
        options: [
          { label: 'Todos los tipos', value: '' },
          ...ANALYSIS_TYPES.map((type) => ({ label: type === 'energy' ? 'Energía' : type, value: type })),
        ],
      }]
    : []),
]);

useFilterSync(filterValues, (values) =>
  analysisStore.applyFilters({
    search: emptyToUndefined(values.search),
    analysis_type: emptyToUndefined(values.analysis_type),
  }),
);

const { table: analysisTable, isInitialLoading } = useTableView(
  useAnalysisColumns(),
  analysisStore,
);

watch(companyId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    filterValues.value = { search: '' };
  }
});

const isCreateModalOpen = ref(false);
const isRenameModalOpen = ref(false);
const renamingAnalysis = ref<Analysis | null>(null);
const isDeleteModalOpen = ref(false);
const deletingAnalysis = ref<Analysis | null>(null);

function openCreateModal() {
  analysisStore.error = null;
  isCreateModalOpen.value = true;
}

function openDetail(analysis: Analysis) {
  router.push(companyPath(`/analyses/${analysis.id}`));
}

function handleCreated() {
  analysisStore.fetchAnalyses(1).catch(() => {});
}

function openRenameModal(analysis: Analysis) {
  analysisStore.error = null;
  renamingAnalysis.value = analysis;
  isRenameModalOpen.value = true;
}

function handleRenamed() {
  isRenameModalOpen.value = false;
}

function openDeleteModal(analysis: Analysis) {
  analysisStore.error = null;
  deletingAnalysis.value = analysis;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!deletingAnalysis.value) return;
  try {
    await analysisStore.deleteAnalysis(deletingAnalysis.value.id);
    isDeleteModalOpen.value = false;
    deletingAnalysis.value = null;
    toast.success('Análisis eliminado correctamente');
  } catch {
    isDeleteModalOpen.value = true;
  }
}

onMounted(() => {
  analysisStore.fetchAnalyses().catch(() => {});
});

useCreateAction(() => openCreateModal());
</script>

<style scoped>
.analyses-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
</style>
