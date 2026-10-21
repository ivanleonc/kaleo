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

      <div v-if="hasActiveFilters" class="active-filters" aria-label="Filtros activos">
        <span class="active-filters-label">Filtros activos</span>
        <button
          v-if="activeSearch"
          type="button"
          class="filter-chip"
          @click="clearSearch"
        >
          <span class="filter-chip-text">“{{ activeSearch }}”</span>
          <IconX :size="12" stroke-width="2" aria-hidden="true" />
          <span class="sr-only">Quitar búsqueda</span>
        </button>
        <button
          v-if="filterValues.analysis_type"
          type="button"
          class="filter-chip"
          @click="clearType"
        >
          {{ analysisTypeLabel(filterValues.analysis_type) }}
          <IconX :size="12" stroke-width="2" aria-hidden="true" />
          <span class="sr-only">Quitar filtro de tipo</span>
        </button>
      </div>

      <div class="table-section">
        <AnalysisTable
          :table="analysisTable"
          :loading="isInitialLoading"
          :error="analysisStore.error"
          error-title="No pudimos cargar los análisis"
          :empty-title="emptyTitle"
          :empty-description="emptyDescription"
          @retry="analysisStore.fetchAnalyses()"
          @view="openDetail"
          @rename="openRenameModal"
          @delete="openDeleteModal"
        >
          <template #empty-action>
            <UiButton
              v-if="hasActiveFilters"
              variant="outline"
              width="auto"
              @click="clearFilters"
            >
              Limpiar filtros
            </UiButton>
            <UiButton
              v-else
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
import { useRoute, useRouter } from 'vue-router';
import { IconPlus, IconX } from '@tabler/icons-vue';
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
import type { ServerSort } from '@/composables/useAppTable';
import { Permissions } from '@/constants/permissions';
import {
  ANALYSIS_TYPES,
  analysisTypeLabel,
  type Analysis,
} from '@/types/analysis';
import { emptyToUndefined } from '@/utils/text';

const DEFAULT_LIMIT = 20;
const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE_FIELDS = new Set(['name', 'analysis_type', 'created_at']);
const MANAGED_QUERY_KEYS = new Set([
  'search',
  'analysis_type',
  'page',
  'limit',
  'sortBy',
  'sortDir',
]);

const route = useRoute();
const router = useRouter();
const analysisStore = useAnalysisStore();
const toast = useToast();
const { companyId, companyPath } = useCompanyPath();

function queryValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(queryValue(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const initialSearch = queryValue(route.query.search);
const initialType = ANALYSIS_TYPES.includes(
  queryValue(route.query.analysis_type) as (typeof ANALYSIS_TYPES)[number],
)
  ? queryValue(route.query.analysis_type)
  : '';
const requestedLimit = positiveInt(route.query.limit, DEFAULT_LIMIT);
const initialLimit = PAGE_SIZES.includes(requestedLimit) ? requestedLimit : DEFAULT_LIMIT;
const initialPage = positiveInt(route.query.page, 1);
const initialSortBy = queryValue(route.query.sortBy);
const initialSort: ServerSort = SORTABLE_FIELDS.has(initialSortBy)
  ? {
      sortBy: initialSortBy,
      sortDir: queryValue(route.query.sortDir) === 'desc' ? 'desc' : 'asc',
    }
  : {};

const filterValues = ref<Record<string, string>>({
  search: initialSearch,
  analysis_type: initialType,
});

const activeSearch = computed(() => (filterValues.value.search ?? '').trim());

const hasActiveFilters = computed(() =>
  Boolean(activeSearch.value || filterValues.value.analysis_type),
);

const emptyTitle = computed(() =>
  hasActiveFilters.value ? 'Sin resultados' : 'No hay análisis todavía',
);

const emptyDescription = computed(() =>
  hasActiveFilters.value
    ? 'Prueba con otra búsqueda o limpia los filtros para ver todo el historial.'
    : 'Carga tu primer Excel para generar y guardar un análisis.',
);

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
  initialSort,
);

function syncQuery() {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(route.query)) {
    if (!MANAGED_QUERY_KEYS.has(key) && typeof value === 'string' && value) {
      query[key] = value;
    }
  }

  if (activeSearch.value) query.search = activeSearch.value;
  if (filterValues.value.analysis_type) {
    query.analysis_type = filterValues.value.analysis_type;
  }
  if (analysisStore.page > 1) query.page = String(analysisStore.page);
  if (analysisStore.limit !== DEFAULT_LIMIT) {
    query.limit = String(analysisStore.limit);
  }
  if (analysisStore.sortBy) {
    query.sortBy = analysisStore.sortBy;
    query.sortDir = analysisStore.sortDir;
  }

  router.replace({ query }).catch(() => {});
}

watch(
  [
    filterValues,
    () => analysisStore.page,
    () => analysisStore.limit,
    () => analysisStore.sortBy,
    () => analysisStore.sortDir,
  ],
  syncQuery,
  { deep: true },
);

watch(companyId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    filterValues.value = { search: '', analysis_type: '' };
  }
});

function clearSearch() {
  filterValues.value = { ...filterValues.value, search: '' };
}

function clearType() {
  filterValues.value = { ...filterValues.value, analysis_type: '' };
}

function clearFilters() {
  filterValues.value = { search: '', analysis_type: '' };
}

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
  analysisStore
    .initialize({
      filters: {
        search: emptyToUndefined(filterValues.value.search),
        analysis_type: emptyToUndefined(filterValues.value.analysis_type),
      },
      page: initialPage,
      limit: initialLimit,
      sort: initialSort,
    })
    .catch(() => {});
});

useCreateAction(() => openCreateModal());
</script>

<style scoped>
.analyses-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: calc(var(--space-8) * -1 + var(--space-2));
}

.active-filters-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: min(100%, 28rem);
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: var(--bg-card);
  color: var(--text-main);
  font: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
}

.filter-chip:hover {
  border-color: var(--text-light);
  background-color: var(--bg-hover);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.filter-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .filter-chip {
    min-height: 40px;
  }
}
</style>
