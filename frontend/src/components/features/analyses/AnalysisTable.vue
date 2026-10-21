<template>
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    caption="Listado de análisis"
    @retry="emit('retry')"
  >
    <template #cell-name="{ row }">
      <div class="analysis-name-cell">
        <div class="analysis-icon">
          <IconChartHistogram :size="17" stroke-width="1.8" />
        </div>
        <div class="analysis-name-text">
          <button
            type="button"
            class="analysis-name"
            :title="row.name"
            @click="emit('view', row)"
          >
            {{ row.name }}
          </button>
          <span class="analysis-file" :title="row.file_name || undefined">
            <IconFileSpreadsheet :size="12" stroke-width="1.8" />
            {{ row.file_name || 'Sin archivo' }}
          </span>
        </div>
      </div>
    </template>

    <template #cell-analysis_type="{ row }">
      <div class="analysis-type-cell">
        <AnalysisTypeBadge :type="row.analysis_type" />
        <UiBadge
          v-if="row.source === 'mock'"
          variant="warning"
          size="sm"
        >
          Demo
        </UiBadge>
      </div>
    </template>

    <template #cell-summary="{ row }">
      <div v-if="energySummaryOf(row.summary)" class="analysis-summary">
        <span class="summary-chip">
          <strong>{{ formatInteger(energySummaryOf(row.summary)!.rowsProcessed) }}</strong>
          registros
        </span>
        <span class="summary-chip">
          <strong>{{ formatPercent(energySummaryOf(row.summary)!.kpis.nonTechnicalLossesPct) }}</strong>
          pérdidas
        </span>
        <span class="summary-period">
          {{ periodLabel(energySummaryOf(row.summary)!) }}
        </span>
      </div>
      <span v-else class="text-muted">Sin resumen</span>
    </template>

    <template #cell-created_at="{ row }">
      <div class="analysis-meta">
        <span>{{ formatDateTime(row.created_at) }}</span>
        <span class="analysis-author">{{ row.created_by_name || 'Usuario' }}</span>
      </div>
    </template>

    <template #cell-actions="{ row }">
      <div class="row-actions">
        <UiDropdown align="end" label="Acciones del análisis">
          <template #trigger="{ toggle, triggerAria }">
            <button
              class="dots-btn"
              @click.stop="toggle"
              v-bind="triggerAria"
              :aria-label="`Acciones para ${row.name}`"
            >
              <IconDotsVertical :size="16" stroke-width="1.8" />
            </button>
          </template>
          <template #default>
            <UiDropdownItem @click="emit('view', row)">
              <IconEye :size="14" stroke-width="1.8" />
              <span>Ver detalle</span>
            </UiDropdownItem>
            <UiDropdownItem @click="emit('rename', row)" v-permission="Permissions.ANALYSES.UPDATE">
              <IconPencil :size="14" stroke-width="1.8" />
              <span>Renombrar</span>
            </UiDropdownItem>
            <div class="ui-dropdown-divider" role="separator"></div>
            <UiDropdownItem
              danger
              @click="emit('delete', row)"
              v-permission="Permissions.ANALYSES.DELETE"
            >
              <IconTrash :size="14" stroke-width="1.8" />
              <span>Eliminar</span>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
    </template>

    <template #empty-icon>
      <IconChartHistogram :size="48" stroke-width="1.5" />
    </template>

    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import {
  IconChartHistogram,
  IconDotsVertical,
  IconEye,
  IconFileSpreadsheet,
  IconPencil,
  IconTrash,
} from '@tabler/icons-vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import AnalysisTypeBadge from '@/components/features/analyses/AnalysisTypeBadge.vue';
import { Permissions } from '@/constants/permissions';
import type { AppFeatures } from '@/composables/useAppTable';
import type { Analysis, EnergyAnalysisSummary } from '@/types/analysis';
import { energySummaryOf } from '@/types/analysis';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatInteger, formatPercent } from '@/utils/number';

defineProps<{
  table: AppVueTable<AppFeatures, Analysis, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  view: [analysis: Analysis];
  rename: [analysis: Analysis];
  delete: [analysis: Analysis];
}>();

function periodLabel(summary: EnergyAnalysisSummary): string {
  if (!summary.periodFrom && !summary.periodTo) return '';
  if (summary.periodFrom && summary.periodTo) {
    return `${formatDate(summary.periodFrom)} – ${formatDate(summary.periodTo)}`;
  }
  return formatDate(summary.periodFrom || summary.periodTo);
}
</script>

<style scoped>
.analysis-name-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.analysis-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius);
  background-color: var(--accent-blue-bg);
  color: var(--accent-blue);
}

.analysis-name-text,
.analysis-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.analysis-name {
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 500;
  color: var(--text-main);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.analysis-name:hover {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.analysis-name:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.analysis-file {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-type-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.analysis-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.summary-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background-color: var(--bg-hover);
  color: var(--text-muted);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.summary-chip strong {
  color: var(--text-main);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.summary-period {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.analysis-author {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
