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
      <div class="filters-bar">
        <div class="filter-group">
          <UiSelect
            v-model="filterEntity"
            :options="entityOptions"
            placeholder="Todas las entidades"
          />
        </div>
        <div class="filter-group filter-group-grow">
          <UiSearchInput
            v-model="filterAction"
            placeholder="Buscar por acción..."
            @update:model-value="debouncedFetch"
          />
        </div>
        <div class="filter-group filter-dates">
          <input v-model="filterFrom" type="date" class="filter-date" @change="applyFilters" />
          <span class="date-sep">hasta</span>
          <input v-model="filterTo" type="date" class="filter-date" @change="applyFilters" />
        </div>
        <button v-if="hasActiveFilters" class="clear-btn" @click="clearFilters">
          <IconX :size="14" /> Limpiar
        </button>
      </div>

      <!-- Loading -->
      <div v-if="auditStore.isLoading && auditStore.logs.length === 0" class="loading-state">
        Cargando registros...
      </div>

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
          <div class="timeline-dot" :class="getActionClass(log.action)">
            <component :is="getActionIcon(log.action)" :size="14" />
          </div>
          <div class="timeline-connector" v-if="idx < auditStore.logs.length - 1" />

          <div class="timeline-card">
            <div class="timeline-card-header">
              <div class="timeline-action">
                <span class="action-badge" :class="getActionClass(log.action)">
                  {{ getMethodLabel(log.action) }}
                </span>
                <span class="action-path">{{ cleanPath(log.action) }}</span>
                <span
                  v-if="log.response_status"
                  class="status-badge"
                  :class="getStatusClass(log.response_status)"
                >
                  {{ log.response_status }}
                </span>
              </div>
              <div class="timeline-right">
                <span v-if="log.duration_ms" class="duration-badge">
                  {{ log.duration_ms }}ms
                </span>
                <span class="timeline-time" :title="formatFullDate(log.created_at)">
                  {{ formatRelativeTime(log.created_at) }}
                </span>
              </div>
            </div>

            <div class="timeline-card-body">
              <div class="timeline-meta">
                <div class="meta-user" v-if="log.user_name || log.user_email" title="Quién realizó la acción">
                  <div class="user-avatar-sm">{{ getInitials(log.user_name) }}</div>
                  <span>{{ log.user_name || log.user_email }}</span>
                </div>
                <div class="meta-user" v-else-if="log.user_id" title="Quién realizó la acción">
                  <div class="user-avatar-sm unknown">?</div>
                  <span class="text-muted">Usuario eliminado</span>
                </div>
                <div class="meta-entity">
                  <span class="entity-badge">{{ log.entity_type }}</span>
                </div>
              </div>

              <div class="meta-subject" v-if="getSubjectName(log)" title="Registro afectado por la acción">
                <IconArrowRight :size="12" class="subject-arrow" />
                <span class="subject-label">{{ getSubjectKindLabel(log) }}:</span>
                <strong class="subject-name">{{ getSubjectName(log) }}</strong>
                <span v-if="getSubjectDetail(log)" class="subject-detail">{{ getSubjectDetail(log) }}</span>
              </div>

              <!-- Changes -->
              <div v-if="hasChanges(log)" class="changes-section">
                <button class="changes-toggle" @click="toggleChanges(log.id)">
                  <IconChevronDown
                    :size="14"
                    class="toggle-chevron"
                    :class="{ rotated: !expandedLogs.has(log.id) }"
                  />
                  {{ getChangesLabel(log) }}
                </button>
                <div v-if="expandedLogs.has(log.id)" class="changes-content">
                  <div v-for="entry in getChangeEntries(log)" :key="entry.key" class="change-entry">
                    <div class="change-key">{{ entry.key }}</div>
                    <template v-if="isArrayPair(entry.oldVal, entry.newVal)">
                      <div class="array-summary">
                        <span class="array-count added">+{{ arrayAdded(entry.oldVal, entry.newVal).length }} agregados</span>
                        <span class="array-count removed">−{{ arrayRemoved(entry.oldVal, entry.newVal).length }} quitados</span>
                        <span v-if="arrayUnchanged(entry.oldVal, entry.newVal).length" class="array-count same">
                          {{ arrayUnchanged(entry.oldVal, entry.newVal).length }} sin cambios
                        </span>
                      </div>
                      <div v-for="(item, i) in arrayRemoved(entry.oldVal, entry.newVal)" :key="'rm-' + i" class="array-item removed">
                        <span class="array-sign">−</span><span>{{ formatValue(item) }}</span>
                      </div>
                      <div v-for="(item, i) in arrayAdded(entry.oldVal, entry.newVal)" :key="'add-' + i" class="array-item added">
                        <span class="array-sign">+</span><span>{{ formatValue(item) }}</span>
                      </div>
                      <details v-if="arrayUnchanged(entry.oldVal, entry.newVal).length" class="array-unchanged">
                        <summary>Ver sin cambios</summary>
                        <div v-for="(item, i) in arrayUnchanged(entry.oldVal, entry.newVal)" :key="'same-' + i" class="array-item same">
                          <span>{{ formatValue(item) }}</span>
                        </div>
                      </details>
                    </template>
                    <template v-else-if="entry.hasOld && Array.isArray(entry.oldVal) && !entry.hasNew">
                      <div class="array-summary">
                        <span class="array-count removed">−{{ entry.oldVal.length }} eliminados</span>
                      </div>
                      <div v-for="(item, i) in entry.oldVal" :key="'old-arr-' + i" class="array-item removed">
                        <span class="array-sign">−</span><span>{{ formatValue(item) }}</span>
                      </div>
                    </template>
                    <template v-else-if="entry.hasNew && Array.isArray(entry.newVal) && !entry.hasOld">
                      <div class="array-summary">
                        <span class="array-count added">+{{ entry.newVal.length }} agregados</span>
                      </div>
                      <div v-for="(item, i) in entry.newVal" :key="'new-arr-' + i" class="array-item added">
                        <span class="array-sign">+</span><span>{{ formatValue(item) }}</span>
                      </div>
                    </template>
                    <template v-else>
                      <div v-if="entry.hasOld" class="change-row old">
                        <span class="mini-badge old">Antes</span>
                        <span class="change-value old-value">{{ formatValue(entry.oldVal) }}</span>
                      </div>
                      <div v-if="entry.hasNew" class="change-row new">
                        <span class="mini-badge new">Después</span>
                        <span class="change-value new-value">{{ formatValue(entry.newVal) }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Error display -->
              <div v-if="log.response_data?.error" class="error-section">
                <div class="error-badge">
                  <IconAlertCircle :size="14" />
                  <span>{{ log.response_data.message }}</span>
                </div>
              </div>

              <!-- Response display (non-error) -->
              <div v-if="log.response_data && !log.response_data.error && hasDataToShow(log.response_data)" class="response-section">
                <button class="changes-toggle" @click="toggleResponse(log.id)">
                  <IconChevronDown
                    :size="14"
                    class="toggle-chevron"
                    :class="{ rotated: !expandedResponses.has(log.id) }"
                  />
                  Ver respuesta
                </button>
                <div v-if="expandedResponses.has(log.id)" class="changes-content">
                  <div v-for="(value, key) in log.response_data" :key="'resp-' + key" class="change-row new">
                    <span class="change-key">{{ key }}</span>
                    <span class="change-value">{{ formatValue(value) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="timeline-card-footer" v-if="log.ip_address">
              <IconGlobe :size="12" />
              <span>{{ log.ip_address }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <UiPagination
        :page="auditStore.page"
        :total="auditStore.total"
        :limit="auditStore.limit"
        @update:page="auditStore.setPage"
      />
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuditStore } from '@/stores/audit.store';
import { useAuthStore } from '@/stores/auth.store';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import UiExportButton from '@/components/ui/UiExportButton.vue';
import { auditService } from '@/services/audit.service';
import {
  IconClipboardList,
  IconX,
  IconChevronDown,
  IconGlobe,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-vue';

const auditStore = useAuditStore();
const authStore = useAuthStore();

const filterEntity = ref('');
const filterAction = ref('');
const filterFrom = ref('');
const filterTo = ref('');
const expandedLogs = ref(new Set<string>());
const expandedResponses = ref(new Set<string>());
let debounceTimer: ReturnType<typeof setTimeout>;

const entityOptions = computed(() => [
  { label: 'Todas las entidades', value: '' },
  ...auditStore.entityTypes.map((t) => ({ label: t, value: t })),
]);

const hasActiveFilters = computed(() =>
  filterEntity.value || filterAction.value || filterFrom.value || filterTo.value
);

function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 300);
}

function applyFilters() {
  auditStore.setFilters({
    entityType: filterEntity.value || undefined,
    action: filterAction.value || undefined,
    from: filterFrom.value || undefined,
    to: filterTo.value || undefined,
  });
}

function clearFilters() {
  filterEntity.value = '';
  filterAction.value = '';
  filterFrom.value = '';
  filterTo.value = '';
  auditStore.resetFilters();
}

function fetchExportBlob() {
  return auditService.fetchCsvBlob({
    entityType: filterEntity.value || undefined,
    action: filterAction.value || undefined,
    from: filterFrom.value || undefined,
    to: filterTo.value || undefined,
  });
}

function toggleChanges(id: string) {
  if (expandedLogs.value.has(id)) expandedLogs.value.delete(id);
  else expandedLogs.value.add(id);
}

function toggleResponse(id: string) {
  if (expandedResponses.value.has(id)) expandedResponses.value.delete(id);
  else expandedResponses.value.add(id);
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-success';
  if (status >= 300 && status < 400) return 'status-redirect';
  if (status >= 400 && status < 500) return 'status-client-error';
  if (status >= 500) return 'status-server-error';
  return 'status-default';
}

function hasDataToShow(data: any): boolean {
  if (!data) return false;
  return Object.keys(data).length > 0;
}

function getMethodLabel(action: string): string {
  const method = action.split(' ')[0];
  return method || 'UNKNOWN';
}

function cleanPath(action: string): string {
  return action.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/, '').replace(/^\/api/, '');
}

function getActionClass(action: string): string {
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

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function userTimeZone(): string | undefined {
  const tz = authStore.user?.timezone;
  if (!tz) return undefined;
  try {
    Intl.DateTimeFormat('es-ES', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  // nowTick mantiene los tiempos relativos vivos sin recargar
  const now = new Date(nowTick.value);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;
  const tz = userTimeZone();
  return date.toLocaleDateString('es-ES', tz ? { day: 'numeric', month: 'short', timeZone: tz } : { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  const tz = userTimeZone();
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  });
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—';
  if (val === '[REDACTED]') return '••••••••';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function hasChanges(log: any): boolean {
  const oldVals = getChangedOldValues(log);
  const newVals = getChangedNewValues(log);
  return Boolean((oldVals && Object.keys(oldVals).length > 0) || (newVals && Object.keys(newVals).length > 0));
}

function getChangedOldValues(log: any): Record<string, any> | null {
  if (!log.old_values || !log.new_values) return log.old_values || null;
  const changed: Record<string, any> = {};
  for (const key of Object.keys(log.new_values)) {
    if (key in log.old_values && JSON.stringify(log.old_values[key]) !== JSON.stringify(log.new_values[key])) {
      changed[key] = log.old_values[key];
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

function getChangedNewValues(log: any): Record<string, any> | null {
  if (!log.old_values || !log.new_values) return log.new_values || null;
  const changed: Record<string, any> = {};
  for (const key of Object.keys(log.new_values)) {
    if (!(key in log.old_values) || JSON.stringify(log.old_values[key]) !== JSON.stringify(log.new_values[key])) {
      changed[key] = log.new_values[key];
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

function getSubjectName(log: any): string | null {
  const old = log.old_values || {};
  const nw = log.new_values || {};
  return old.name || nw.name || old.email || nw.email || null;
}

function getSubjectDetail(log: any): string | null {
  const old = log.old_values || {};
  const nw = log.new_values || {};
  const name = old.name || nw.name;
  const email = old.email || nw.email;
  if (name && email) return email;
  return null;
}

function getSubjectKindLabel(log: any): string {
  const kinds: Record<string, string> = {
    Member: 'Miembro',
    User: 'Usuario',
    Role: 'Rol',
    Branch: 'Sede',
    Company: 'Empresa',
    Auth: 'Cuenta',
    Permission: 'Permiso',
    Settings: 'Configuración',
  };
  return kinds[log.entity_type] || 'Registro';
}

interface ChangeEntry {
  key: string;
  hasOld: boolean;
  hasNew: boolean;
  oldVal: any;
  newVal: any;
}

function getChangeEntries(log: any): ChangeEntry[] {
  const newVals = getChangedNewValues(log) || {};
  const oldVals = getChangedOldValues(log) || {};
  const keys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
  return [...keys].map((key) => ({
    key,
    hasOld: key in oldVals,
    hasNew: key in newVals,
    oldVal: oldVals[key],
    newVal: newVals[key],
  }));
}

function isArrayPair(oldVal: any, newVal: any): boolean {
  return Array.isArray(oldVal) && Array.isArray(newVal);
}

function normVal(v: any): string {
  return JSON.stringify(v);
}

function arrayAdded(oldVal: any[], newVal: any[]): any[] {
  const oldSet = new Set(oldVal.map(normVal));
  return newVal.filter((v) => !oldSet.has(normVal(v)));
}

function arrayRemoved(oldVal: any[], newVal: any[]): any[] {
  const newSet = new Set(newVal.map(normVal));
  return oldVal.filter((v) => !newSet.has(normVal(v)));
}

function arrayUnchanged(oldVal: any[], newVal: any[]): any[] {
  const newSet = new Set(newVal.map(normVal));
  return oldVal.filter((v) => newSet.has(normVal(v)));
}

function getChangesLabel(log: any): string {
  const hasOld = log.old_values && Object.keys(log.old_values).length > 0;
  const hasNew = log.new_values && Object.keys(log.new_values).length > 0;
  if (hasOld && hasNew) return 'Ver cambios (antes/despues)';
  if (hasNew) return 'Ver datos enviados';
  return 'Ver datos anteriores';
}

const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  auditStore.fetchLogs();
  auditStore.fetchEntityTypes();
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 60000);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
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
.timeline-dot.action-create { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.timeline-dot.action-update { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.timeline-dot.action-delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.timeline-dot.action-read { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
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
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.timeline-action {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.action-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 3px;
}
.action-badge.action-create { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.action-badge.action-update { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.action-badge.action-delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.action-badge.action-read { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

.action-path {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-sm);
  color: var(--text-main);
}

.timeline-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: var(--space-1);
}
.status-success { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-redirect { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-client-error { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.status-server-error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.status-default { background: var(--bg-app); color: var(--text-muted); }

.duration-badge {
  font-size: 10px;
  font-family: var(--font-mono, monospace);
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
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  color: #ef4444;
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

.user-avatar-sm {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-app);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}
.user-avatar-sm.unknown { background: var(--bg-hover); }

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

.change-row.old .change-value { color: var(--color-danger); text-decoration: line-through; opacity: 0.7; }
.change-row.new .change-value { color: #22c55e; }

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
.mini-badge.old { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.mini-badge.new { background: rgba(34, 197, 94, 0.12); color: #22c55e; }

.array-summary {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: 11px;
  margin: 2px 0 6px;
}
.array-count.added { color: #22c55e; font-weight: 700; }
.array-count.removed { color: #ef4444; font-weight: 700; }
.array-count.same { color: var(--text-muted); }

.array-item {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-xs);
  padding: 2px 0;
}
.array-item.removed { color: #ef4444; }
.array-item.removed span:last-child { text-decoration: line-through; opacity: 0.8; }
.array-item.added { color: #22c55e; }
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
}
</style>
