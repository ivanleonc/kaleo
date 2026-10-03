<template>
  <!--
    AuditLogEntry — Tarjeta individual de un evento en la línea de tiempo de auditoría.

    Maneja internamente la expansión de cambios y respuestas (estado UI local).
    Las funciones de formato de fecha se reciben por prop para que la view
    controle el reloj relativo (nowTick) sin acoplar este componente al store de auth.

    Props:
      - log: el objeto AuditLog
      - formatRelative: función que convierte fecha ISO → "Hace X min"
      - formatFull: función que convierte fecha ISO → fecha completa para el tooltip
  -->
  <div class="timeline-card" :class="actionDotClass">
    <!-- Cabecera: acción + timestamp + duración -->
    <div class="timeline-card-header">
      <div class="timeline-action">
        <UiBadge size="sm" :variant="actionVariant">
          {{ methodLabel }}
        </UiBadge>
        <span class="action-label">{{ actionDescription }}</span>
        <span class="action-path" :title="log.action">{{ cleanPath }}</span>
        <UiBadge
          v-if="log.response_status"
          size="sm"
          :variant="statusVariant"
        >
          {{ log.response_status }}
        </UiBadge>
      </div>
      <div class="timeline-right">
        <span v-if="log.duration_ms" class="duration-badge">{{ log.duration_ms }}ms</span>
        <span class="timeline-time" :title="formatFull(log.created_at)">
          {{ formatRelative(log.created_at) }}
        </span>
      </div>
    </div>

    <!-- Cuerpo: usuario + entidad + sujeto + cambios -->
    <div class="timeline-card-body">
      <div class="timeline-meta">
        <div class="meta-user" v-if="log.user_name || log.user_email" title="Quién realizó la acción">
          <UiAvatar :name="log.user_name" size="sm" />
          <span>{{ log.user_name || log.user_email }}</span>
        </div>
        <div class="meta-user" v-else-if="log.user_id" title="Quién realizó la acción">
          <UiAvatar size="sm" />
          <span class="text-muted">Usuario eliminado</span>
        </div>
        <div class="meta-entity">
          <span class="entity-badge">{{ log.entity_type }}</span>
        </div>
      </div>

      <div class="meta-subject" v-if="subjectName" title="Registro afectado por la acción">
        <IconArrowRight :size="12" class="subject-arrow" />
        <span class="subject-label">{{ subjectKindLabel }}:</span>
        <strong class="subject-name">{{ subjectName }}</strong>
        <span v-if="subjectDetail" class="subject-detail">{{ subjectDetail }}</span>
      </div>

      <!-- Cambios (antes/después) -->
      <div v-if="hasChanges" class="changes-section">
        <button class="changes-toggle" @click="showChanges = !showChanges">
          <IconChevronDown
            :size="14"
            class="toggle-chevron"
            :class="{ rotated: !showChanges }"
          />
          {{ changesLabel }}
        </button>
        <div v-if="showChanges" class="changes-content">
          <div v-for="entry in changeEntries" :key="entry.key" class="change-entry">
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
                <span class="array-sign">−</span><span>{{ fmtVal(item) }}</span>
              </div>
              <div v-for="(item, i) in arrayAdded(entry.oldVal, entry.newVal)" :key="'add-' + i" class="array-item added">
                <span class="array-sign">+</span><span>{{ fmtVal(item) }}</span>
              </div>
              <details v-if="arrayUnchanged(entry.oldVal, entry.newVal).length" class="array-unchanged">
                <summary>Ver sin cambios</summary>
                <div v-for="(item, i) in arrayUnchanged(entry.oldVal, entry.newVal)" :key="'same-' + i" class="array-item same">
                  <span>{{ fmtVal(item) }}</span>
                </div>
              </details>
            </template>
            <template v-else-if="entry.hasOld && Array.isArray(entry.oldVal) && !entry.hasNew">
              <div class="array-summary">
                <span class="array-count removed">−{{ toArr(entry.oldVal).length }} eliminados</span>
              </div>
              <div v-for="(item, i) in toArr(entry.oldVal)" :key="'old-arr-' + i" class="array-item removed">
                <span class="array-sign">−</span><span>{{ fmtVal(item) }}</span>
              </div>
            </template>
            <template v-else-if="entry.hasNew && Array.isArray(entry.newVal) && !entry.hasOld">
              <div class="array-summary">
                <span class="array-count added">+{{ toArr(entry.newVal).length }} agregados</span>
              </div>
              <div v-for="(item, i) in toArr(entry.newVal)" :key="'new-arr-' + i" class="array-item added">
                <span class="array-sign">+</span><span>{{ fmtVal(item) }}</span>
              </div>
            </template>
            <template v-else>
              <div v-if="entry.hasOld" class="change-row old">
                <span class="mini-badge old">Antes</span>
                <span class="change-value old-value">{{ fmtVal(entry.oldVal) }}</span>
              </div>
              <div v-if="entry.hasNew" class="change-row new">
                <span class="mini-badge new">Después</span>
                <span class="change-value new-value">{{ fmtVal(entry.newVal) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Sección de error -->
      <div v-if="log.response_data?.error" class="error-section">
        <div class="error-badge">
          <IconAlertCircle :size="14" />
          <span>{{ log.response_data.message }}</span>
        </div>
      </div>

      <!-- Sección de respuesta (no error) -->
      <div v-if="log.response_data && !log.response_data.error && hasResponseData" class="response-section">
        <button class="changes-toggle" @click="showResponse = !showResponse">
          <IconChevronDown
            :size="14"
            class="toggle-chevron"
            :class="{ rotated: !showResponse }"
          />
          Ver respuesta
        </button>
        <div v-if="showResponse" class="changes-content">
          <div v-for="(value, key) in log.response_data" :key="'resp-' + key" class="change-row new">
            <span class="change-key">{{ key }}</span>
            <span class="change-value">{{ fmtVal(value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: IP -->
    <div class="timeline-card-footer" v-if="log.ip_address">
      <IconGlobe :size="12" />
      <span>{{ log.ip_address }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import type { AuditLog } from '@/types/audit';
import type { BadgeVariant } from '@/types/ui';
import {
  IconChevronDown,
  IconGlobe,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-vue';

const props = defineProps<{
  log: AuditLog;
  /** Formatea fecha ISO → "Hace X min" (controlado por la view para nowTick). */
  formatRelative: (dateStr: string) => string;
  /** Formatea fecha ISO → fecha completa para tooltip. */
  formatFull: (dateStr: string) => string;
}>();

// --- Estado UI local ---
const showChanges = ref(false);
const showResponse = ref(false);

// --- Computed: metadatos de la acción ---
const methodLabel = computed(() => props.log.action.split(' ')[0] ?? 'UNKNOWN');

const cleanPath = computed(() =>
  props.log.action.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/, '').replace(/^\/api/, ''),
);

const actionDescription = computed(() => {
  const method = props.log.action.split(' ')[0] ?? '';
  const path = props.log.action.slice(method.length).trim().toLowerCase();

  if (path.includes('/login')) return 'Inicio de sesión';
  if (path.includes('/logout')) return 'Cierre de sesión';
  if (path.includes('/refresh')) return 'Sesión renovada';
  if (path.includes('/forgot-password') || path.includes('/request-password-reset'))
    return 'Recuperación de contraseña solicitada';
  if (path.includes('/reset-password')) return 'Contraseña restablecida';
  if (path.includes('/change-temporary-password')) return 'Contraseña temporal cambiada';
  if (path.includes('/change-password')) return 'Contraseña cambiada';
  if (path.includes('/verify-email') || path.includes('/email/verify')) return 'Correo verificado';
  if (path.includes('/register')) return 'Cuenta registrada';
  if (path.includes('/profile'))
    return method === 'GET' ? 'Perfil consultado' : 'Perfil actualizado';

  const entity =
    /\/members|\/users/.test(path) ? 'member'
    : /\/branches/.test(path) ? 'branch'
    : /\/roles/.test(path) ? 'role'
    : /\/permissions/.test(path) ? 'permission'
    : /\/companies/.test(path) ? 'company'
    : null;

  if (!entity) return methodLabel.value;

  const labels: Record<string, Record<string, string>> = {
    member: { POST: 'Miembro agregado', PUT: 'Miembro actualizado', PATCH: 'Miembro actualizado', DELETE: 'Miembro eliminado', GET: 'Miembros consultados' },
    branch: { POST: 'Sede creada', PUT: 'Sede actualizada', PATCH: 'Sede actualizada', DELETE: 'Sede eliminada', GET: 'Sedes consultadas' },
    role: { POST: 'Rol creado', PUT: 'Rol actualizado', PATCH: 'Rol actualizado', DELETE: 'Rol eliminado', GET: 'Roles consultados' },
    permission: { POST: 'Permiso actualizado', PUT: 'Permiso actualizado', PATCH: 'Permiso actualizado', DELETE: 'Permiso eliminado', GET: 'Permisos consultados' },
    company: { POST: 'Empresa creada', PUT: 'Empresa actualizada', PATCH: 'Empresa actualizada', DELETE: 'Empresa eliminada', GET: 'Empresa consultada' },
  };
  return labels[entity]?.[method] ?? methodLabel.value;
});

const actionVariant = computed((): BadgeVariant => {
  const m = methodLabel.value;
  if (m === 'POST') return 'success';
  if (m === 'PUT' || m === 'PATCH') return 'info';
  if (m === 'DELETE') return 'danger';
  return 'neutral';
});

const actionDotClass = computed(() => {
  const m = methodLabel.value;
  if (m === 'POST') return 'action-create';
  if (m === 'PUT' || m === 'PATCH') return 'action-update';
  if (m === 'DELETE') return 'action-delete';
  if (m === 'GET') return 'action-read';
  return 'action-default';
});

const statusVariant = computed((): BadgeVariant => {
  const s = props.log.response_status ?? 0;
  if (s >= 200 && s < 300) return 'success';
  if (s >= 300 && s < 400) return 'info';
  if (s >= 400 && s < 500) return 'warning';
  if (s >= 500) return 'danger';
  return 'neutral';
});

// --- Sujeto del log (registro afectado) ---
const subjectName = computed(() => {
  const old = (props.log as any).old_values ?? {};
  const nw = (props.log as any).new_values ?? {};
  return old.name || nw.name || old.email || nw.email || null;
});

const subjectDetail = computed(() => {
  const old = (props.log as any).old_values ?? {};
  const nw = (props.log as any).new_values ?? {};
  const name = old.name || nw.name;
  const email = old.email || nw.email;
  return (name && email) ? email : null;
});

const subjectKindLabel = computed(() => {
  const kinds: Record<string, string> = {
    Member: 'Miembro', User: 'Usuario', Role: 'Rol', Branch: 'Sede',
    Company: 'Empresa', Auth: 'Cuenta', Permission: 'Permiso', Settings: 'Configuración',
  };
  return kinds[props.log.entity_type] ?? 'Registro';
});

// --- Cambios ---
function getChangedOldValues(log: AuditLog): Record<string, unknown> | null {
  const l = log as any;
  if (!l.old_values || !l.new_values) return l.old_values ?? null;
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(l.new_values)) {
    if (key in l.old_values && JSON.stringify(l.old_values[key]) !== JSON.stringify(l.new_values[key])) {
      changed[key] = l.old_values[key];
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

function getChangedNewValues(log: AuditLog): Record<string, unknown> | null {
  const l = log as any;
  if (!l.old_values || !l.new_values) return l.new_values ?? null;
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(l.new_values)) {
    if (!(key in l.old_values) || JSON.stringify(l.old_values[key]) !== JSON.stringify(l.new_values[key])) {
      changed[key] = l.new_values[key];
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

const hasChanges = computed(() => {
  const oldVals = getChangedOldValues(props.log);
  const newVals = getChangedNewValues(props.log);
  return Boolean(
    (oldVals && Object.keys(oldVals).length > 0) ||
    (newVals && Object.keys(newVals).length > 0),
  );
});

const changesLabel = computed(() => {
  const l = props.log as any;
  const hasOld = l.old_values && Object.keys(l.old_values).length > 0;
  const hasNew = l.new_values && Object.keys(l.new_values).length > 0;
  if (hasOld && hasNew) return 'Ver cambios (antes/después)';
  if (hasNew) return 'Ver datos enviados';
  return 'Ver datos anteriores';
});

interface ChangeEntry {
  key: string;
  hasOld: boolean;
  hasNew: boolean;
  oldVal: unknown;
  newVal: unknown;
}

const changeEntries = computed((): ChangeEntry[] => {
  const newVals = getChangedNewValues(props.log) ?? {};
  const oldVals = getChangedOldValues(props.log) ?? {};
  const keys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
  return [...keys].map((key) => ({
    key,
    hasOld: key in oldVals,
    hasNew: key in newVals,
    oldVal: oldVals[key],
    newVal: newVals[key],
  }));
});

const hasResponseData = computed(() => {
  const d = props.log.response_data;
  return d != null && Object.keys(d).length > 0;
});

// --- Helpers de formato ---
function fmtVal(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (val === '[REDACTED]') return '••••••••';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function normVal(v: unknown): string {
  return JSON.stringify(v);
}

function isArrayPair(oldVal: unknown, newVal: unknown): boolean {
  return Array.isArray(oldVal) && Array.isArray(newVal);
}

function toArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function arrayAdded(oldVal: unknown, newVal: unknown): unknown[] {
  const old = toArr(oldVal);
  const nw = toArr(newVal);
  const oldSet = new Set(old.map(normVal));
  return nw.filter((v) => !oldSet.has(normVal(v)));
}

function arrayRemoved(oldVal: unknown, newVal: unknown): unknown[] {
  const old = toArr(oldVal);
  const nw = toArr(newVal);
  const newSet = new Set(nw.map(normVal));
  return old.filter((v) => !newSet.has(normVal(v)));
}

function arrayUnchanged(oldVal: unknown, newVal: unknown): unknown[] {
  const old = toArr(oldVal);
  const nw = toArr(newVal);
  const newSet = new Set(nw.map(normVal));
  return old.filter((v) => newSet.has(normVal(v)));
}
</script>

<style scoped>
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

.subject-arrow { color: var(--text-muted); flex-shrink: 0; }
.subject-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.subject-name { font-weight: 600; color: var(--text-main); }
.subject-detail { font-size: var(--text-xs); color: var(--text-muted); }

.meta-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-main);
}

.meta-entity { display: flex; align-items: center; }

.entity-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-app);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.changes-section, .error-section, .response-section { margin-top: var(--space-2); }

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

.toggle-chevron { transition: transform 0.2s; }
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
.change-row.old .change-value { color: var(--diff-remove-text); text-decoration: line-through; opacity: 0.8; }
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
.array-unchanged summary { cursor: pointer; font-size: 11px; color: var(--text-muted); }
.array-unchanged summary:hover { color: var(--text-main); }

.change-key { font-weight: 500; color: var(--text-main); text-transform: capitalize; }
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
  .timeline-card { border-left-width: 3px; }
  .timeline-card.action-create { border-left-color: var(--color-success); }
  .timeline-card.action-update { border-left-color: var(--color-warning); }
  .timeline-card.action-delete { border-left-color: var(--color-danger); }
  .timeline-card.action-read { border-left-color: var(--color-info); }
  .timeline-card.action-default { border-left-color: var(--border); }
}
</style>
