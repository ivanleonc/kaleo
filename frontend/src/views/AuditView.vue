<template>
  <AuthenticatedLayout>
    <div class="audit-container">
      <UiPageHeader
        title="Auditoría"
        subtitle="Registro de todas las acciones realizadas en tu organización."
      >
        <template #actions>
          <UiExportButton label="Exportar CSV" :fetcher="fetchExportBlob" />
        </template>
      </UiPageHeader>

      <!-- Filters -->
      <UiTableFilters v-model="auditFilterValues" :filters="auditFilterDefs">
        <!--
          Par de fechas con el "hasta" original: ejemplo de filtro especial
          montado sobre el escape hatch `#filter-{key}` en vez de dos
          controles genéricos sueltos.
        -->
        <template #filter-from="{ values, update }">
          <span class="filter-dates-label" aria-hidden="true">Período:</span>
          <div class="filter-dates" role="group" aria-label="Período">
            <input
              :value="values.from"
              type="date"
              class="filter-date"
              aria-label="Desde"
              @input="update('from', ($event.target as HTMLInputElement).value)"
            />
            <span class="date-sep">hasta</span>
            <input
              :value="values.to"
              type="date"
              class="filter-date"
              aria-label="Hasta"
              @input="update('to', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </template>
      </UiTableFilters>

      <!-- Loading -->
      <div
        v-if="auditStore.isLoading && auditStore.logs.length === 0"
        class="timeline"
        aria-hidden="true"
      >
        <div v-for="n in 6" :key="n" class="timeline-skeleton">
          <UiSkeleton variant="avatar" width="28px" height="28px" />
          <UiSkeleton variant="block" height="72px" radius="var(--radius-lg)" />
        </div>
      </div>

      <!-- Error -->
      <UiErrorState
        v-else-if="auditStore.error && auditStore.logs.length === 0"
        title="No pudimos cargar la auditoría"
        :description="auditStore.error"
        @retry="auditStore.fetchLogs()"
      />

      <!-- Empty -->
      <UiEmptyState
        v-else-if="!auditStore.isLoading && auditStore.logs.length === 0"
        title="No hay registros de auditoría"
        description="Las acciones realizadas en tu organización aparecerán aquí."
      >
        <template #icon>
          <IconClipboardList :size="48" stroke-width="1.5" />
        </template>
      </UiEmptyState>

      <!-- Timeline -->
      <div v-else class="timeline">
        <div v-for="(log, idx) in auditStore.logs" :key="log.id" class="timeline-item">
          <div class="timeline-dot" :class="getActionDotClass(log.action)">
            <component :is="getActionIcon(log.action)" :size="14" />
          </div>
          <div class="timeline-connector" v-if="idx < auditStore.logs.length - 1" />
          <AuditLogEntry
            :log="log"
            :format-relative="formatRelativeTime"
            :format-full="formatFullDate"
          />
        </div>
      </div>

      <!-- Pagination (por cursor) -->
      <UiCursorPagination
        :has-prev="auditStore.hasPrev"
        :can-go-next="auditStore.canGoNext"
        :loading="auditStore.isLoading"
        :page-index="auditStore.pageIndex"
        :count="auditStore.logs.length"
        total-label="eventos"
        @next="auditStore.nextPage"
        @prev="auditStore.prevPage"
      />
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuditStore } from '@/stores/audit.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiTableFilters, { type TableFilterDef } from '@/components/ui/UiTableFilters.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCursorPagination from '@/components/ui/UiCursorPagination.vue';
import UiExportButton from '@/components/ui/UiExportButton.vue';
import AuditLogEntry from '@/components/features/audit/AuditLogEntry.vue';
import {
  formatDateTime,
  formatRelativeTime as formatRelativeTimeUtil,
  resolveUserTimeZone,
  useNowTick,
} from '@/utils/date';
import { auditService } from '@/services/audit.service';
import { useFilterSync } from '@/composables/useFilterSync';
import {
  IconClipboardList,
  IconChevronDown,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
} from '@tabler/icons-vue';

const auditStore = useAuditStore();
const authStore = useAuthStore();
const { companyId } = useCompanyPath();

// Un solo objeto + un solo watcher profundo: todas las claves disparan el
// fetch (el select de entidad antes no tenía trigger y parecía "muerto").
const auditFilterValues = ref({ entityType: '', action: '', from: '', to: '' });

watch(companyId, (newId, oldId) => {
  if (newId !== oldId && newId) {
    auditFilterValues.value = { entityType: '', action: '', from: '', to: '' };
  }
});

const auditFilterDefs = computed<TableFilterDef[]>(() => [
  {
    key: 'entityType',
    type: 'select',
    label: 'Filtrar por entidad',
    placeholder: 'Todas las entidades',
    options: auditStore.entityTypes.map((t) => ({ label: t, value: t })),
  },
  {
    key: 'action',
    type: 'search',
    label: 'Buscar por acción',
    placeholder: 'Buscar por acción...',
    grow: true,
  },
  { key: 'from', type: 'date', label: 'Desde' },
]);

useFilterSync(auditFilterValues, (v) =>
  auditStore.setFilters({
    entityType: v.entityType || undefined,
    action: v.action || undefined,
    from: v.from || undefined,
    to: v.to || undefined,
  }),
);

const expandedLogs = ref(new Set<string>());
const expandedResponses = ref(new Set<string>());

function fetchExportBlob() {
  return auditService.fetchCsvBlob({
    entityType: auditFilterValues.value.entityType || undefined,
    action: auditFilterValues.value.action || undefined,
    from: auditFilterValues.value.from || undefined,
    to: auditFilterValues.value.to || undefined,
  });
}

/** Clases del punto de la línea de tiempo (colorea el ícono, no el chip). */
function getActionDotClass(action: string): string {
  const method = action.split(' ')[0];
  if (method === 'POST') return 'action-create';
  if (method === 'PUT' || method === 'PATCH') return 'action-update';
  if (method === 'DELETE') return 'action-delete';
  if (method === 'GET') return 'action-read';
  return 'action-default';
}

function getActionIcon(action: string) {
  const method = action.split(' ')[0];
  if (method === 'POST') return IconPlus;
  if (method === 'PUT' || method === 'PATCH') return IconPencil;
  if (method === 'DELETE') return IconTrash;
  if (method === 'GET') return IconEye;
  return IconEye;
}

function userTimeZone(): string | undefined {
  return resolveUserTimeZone(authStore.user?.timezone);
}

function formatRelativeTime(dateStr: string): string {
  return formatRelativeTimeUtil(dateStr, nowTick.value, userTimeZone());
}

function formatFullDate(dateStr: string): string {
  return formatDateTime(dateStr, userTimeZone());
}

// Mantiene vivos los tiempos relativos ("Hace 5m") sin recargar.
const nowTick = useNowTick();

onMounted(() => {
  auditStore.fetchLogs();
  auditStore.fetchEntityTypes();
});
</script>

<style scoped>
.audit-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.filter-dates {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-dates-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
}

.filter-date {
  height: 2rem;
  padding: 0 var(--space-2);
  font-size: var(--text-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-app);
  color: var(--text-main);
  outline: none;
}
.filter-date:focus {
  border-color: var(--text-main);
}

.date-sep {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Timeline */
.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}
.timeline-skeleton :last-child {
  flex: 1;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: var(--space-4);
  padding-left: 20px;
}

.timeline-dot {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 12px;
}
.timeline-dot.action-create {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.timeline-dot.action-update {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.timeline-dot.action-delete {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.timeline-dot.action-read {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.timeline-dot.action-default { background: var(--bg-app); color: var(--text-muted); }

.timeline-connector {
  position: absolute;
  left: 33px;
  top: 40px;
  bottom: -1px;
  width: 2px;
  background: var(--border);
}

.timeline-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--space-3);
}

.timeline-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.timeline-action {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
}

.action-label {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-main);
}

.action-path {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.timeline-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.duration-badge {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--bg-app);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 3px;
}

.timeline-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.timeline-card-body {
  padding: var(--space-3) var(--space-4);
}

.error-section {
  margin-top: var(--space-2);
}

.error-badge {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  color: var(--color-danger-text);
  font-size: var(--text-sm);
}

.response-section {
  margin-top: var(--space-2);
}

.changes-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.meta-subject {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  font-size: var(--text-sm);
}

.subject-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.subject-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.subject-name {
  font-weight: 600;
  color: var(--text-main);
}

.subject-detail {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.meta-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-main);
}

.meta-entity {
  display: flex;
  align-items: center;
}

.entity-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-app);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.changes-section {
  margin-top: var(--space-2);
}

.changes-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}
.changes-toggle:hover { color: var(--text-main); }

.toggle-chevron {
  transition: transform 0.2s;
}
.toggle-chevron.rotated { transform: rotate(-90deg); }

.changes-content {
  margin-top: var(--space-2);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.change-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
}
.change-row:last-child { border-bottom: none; }

.change-row.old .change-value {
  color: var(--diff-remove-text);
  text-decoration: line-through;
  opacity: 0.8;
}
.change-row.new .change-value { color: var(--diff-add-text); }

.change-entry {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.change-entry:last-child { border-bottom: none; }
.change-entry > .change-key { margin-bottom: 2px; }

.mini-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 3px;
  margin-right: var(--space-2);
  flex-shrink: 0;
}
.mini-badge.old { background: var(--diff-remove-bg); color: var(--diff-remove-text); }
.mini-badge.new { background: var(--diff-add-bg); color: var(--diff-add-text); }

.array-summary {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: 11px;
  margin: 2px 0 6px;
}
.array-count.added { color: var(--diff-add-text); font-weight: 700; }
.array-count.removed { color: var(--diff-remove-text); font-weight: 700; }
.array-count.same { color: var(--text-muted); }

.array-item {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-xs);
  padding: 2px 0;
}
.array-item.removed { color: var(--diff-remove-text); }
.array-item.removed span:last-child { text-decoration: line-through; opacity: 0.8; }
.array-item.added { color: var(--diff-add-text); }
.array-item.same { color: var(--text-muted); }
.array-sign { font-weight: 700; width: 12px; flex-shrink: 0; }

.array-unchanged { margin-top: 4px; }
.array-unchanged summary {
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted);
}
.array-unchanged summary:hover { color: var(--text-main); }

.change-key {
  font-weight: 500;
  color: var(--text-main);
  text-transform: capitalize;
}

.change-value {
  font-family: var(--font-mono, monospace);
  color: var(--text-muted);
  max-width: 350px;
  word-break: break-all;
  white-space: pre-wrap;
  text-align: right;
}

.timeline-card-footer {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
}


@media (max-width: 768px) {
  .filters-bar { flex-direction: column; align-items: stretch; }
  .filter-dates { flex-direction: column; align-items: stretch; gap: var(--space-1); }
  .timeline-item { padding-left: 0; }
  .timeline-connector { display: none; }
  .timeline-dot { display: none; }
  /* Sin dots ni conectores, la tarjeta conserva la jerarquía temporal con
     un borde lateral del color de la acción. */
  .timeline-card { border-left-width: 3px; }
  .timeline-card.action-create { border-left-color: var(--color-success); }
  .timeline-card.action-update { border-left-color: var(--color-warning); }
  .timeline-card.action-delete { border-left-color: var(--color-danger); }
  .timeline-card.action-read { border-left-color: var(--color-info); }
  .timeline-card.action-default { border-left-color: var(--border); }
}
</style>
