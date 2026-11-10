<template>
  <AuthenticatedLayout>
    <div class="operations-container">
      <UiPageHeader
        title="Operaciones"
        subtitle="Exportaciones, reportes e importaciones que se ejecutan en segundo plano."
      />

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div class="operation-forms">
        <UiCard>
          <template #header>
            <h3 class="operation-card-title">Exportaciones</h3>
            <p class="operation-card-description">Genera un archivo sin bloquear la request.</p>
          </template>

          <div v-if="exportResourceOptions.length > 0" class="operation-form">
            <UiSelect v-model="exportResource" label="Recurso" :options="exportResourceOptions" :clearable="false" />
            <UiSelect v-model="exportFormat" label="Formato" :options="formatOptions" :clearable="false" />
            <UiButton width="auto" :loading="busy === 'export'" @click="requestExport">
              Generar exportación
            </UiButton>
          </div>
          <p v-else class="operation-hint">No tienes permisos para exportar recursos.</p>

          <div v-if="canReport" class="operation-report">
            <span class="operation-hint">Reporte consolidado de análisis.</span>
            <UiButton
              variant="outline"
              width="auto"
              :loading="busy === 'report'"
              @click="requestReport"
            >
              Generar reporte
            </UiButton>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="operation-card-title">Importar sedes</h3>
            <p class="operation-card-description">CSV o XLSX con columnas name, city, address, etc.</p>
          </template>

          <template v-if="canImport">
            <UiFileDropzone
              v-model="importFile"
              label="Archivo de sedes"
              accept=".csv,.xlsx"
              :max-size="10 * 1024 * 1024"
              hint="CSV o XLSX · máximo 500 filas"
            />
            <UiButton
              class="import-button"
              width="auto"
              :loading="busy === 'import'"
              :disabled="!importFile"
              @click="importBranches"
            >
              Importar sedes
            </UiButton>
          </template>
          <p v-else class="operation-hint">No tienes permiso para crear sedes.</p>
        </UiCard>
      </div>

      <section class="operations-history" aria-labelledby="operations-history-title">
        <h2 id="operations-history-title" class="operations-history-title">Historial</h2>

        <div v-if="isLoading" class="operations-list" aria-hidden="true">
          <UiCard v-for="n in 3" :key="n">
            <UiSkeleton variant="title" width="40%" />
            <UiSkeleton variant="text" width="70%" />
          </UiCard>
        </div>

        <UiEmptyState
          v-else-if="operations.length === 0"
          title="Sin operaciones"
          description="Las exportaciones e importaciones aparecerán aquí."
        />

        <div v-else class="operations-list">
          <UiCard v-for="operation in operations" :key="operation.id" class="operation-item">
            <div class="operation-item-header">
              <div>
                <h3 class="operation-item-title">{{ resourceLabel(operation.resource) }}</h3>
                <p class="operation-item-meta">
                  {{ kindLabel(operation.kind) }}
                  <template v-if="operation.format"> · {{ operation.format.toUpperCase() }}</template>
                  · {{ formatDate(operation.created_at) }}
                </p>
              </div>
              <UiBadge size="sm" :variant="statusVariant(operation.status)">
                {{ statusLabel(operation.status) }}
              </UiBadge>
            </div>

            <p v-if="operation.error" class="operation-error">{{ operation.error }}</p>

            <p v-if="operation.result" class="operation-result">
              Creadas: {{ operation.result.created ?? 0 }} ·
              Fallidas: {{ operation.result.failed ?? 0 }}
            </p>

            <div v-if="operation.status === 'ready' && operation.filename" class="operation-item-footer">
              <UiButton
                variant="outline"
                size="sm"
                width="auto"
                :loading="downloadingId === operation.id"
                @click="download(operation)"
              >
                Descargar {{ operation.filename }}
              </UiButton>
            </div>
          </UiCard>
        </div>
      </section>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import { useAuthStore } from '@/stores/auth.store';
import { Permissions } from '@/constants/permissions';
import { operationsService } from '@/services/operations.service';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import type { ExportResource, Operation, OperationKind, OperationStatus } from '@/types/operation';

const authStore = useAuthStore();
const toast = useToast();
const operations = ref<Operation[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const busy = ref<'export' | 'report' | 'import' | null>(null);
const downloadingId = ref<string | null>(null);
const importFile = ref<File | null>(null);
const exportResource = ref<ExportResource>('members');
const exportFormat = ref<'csv' | 'xlsx'>('csv');
let pollTimer: ReturnType<typeof setInterval> | undefined;

const formatOptions = [
  { label: 'CSV', value: 'csv' },
  { label: 'Excel (XLSX)', value: 'xlsx' },
];

const exportResourceOptions = computed(() => {
  const result: Array<{ label: string; value: ExportResource }> = [];
  if (authStore.hasPermission(Permissions.USERS.READ)) result.push({ label: 'Miembros', value: 'members' });
  if (authStore.hasPermission(Permissions.BRANCHES.READ)) result.push({ label: 'Sedes', value: 'branches' });
  if (authStore.hasPermission(Permissions.ANALYSES.READ)) result.push({ label: 'Análisis', value: 'analyses' });
  if (authStore.hasPermission(Permissions.AUDIT.READ)) result.push({ label: 'Auditoría', value: 'audit' });
  return result;
});

const canReport = computed(() => authStore.hasPermission(Permissions.ANALYSES.READ));
const canImport = computed(() => authStore.hasPermission(Permissions.BRANCHES.CREATE));

watch(
  exportResourceOptions,
  (options) => {
    if (!options.some((option) => option.value === exportResource.value) && options[0]) {
      exportResource.value = options[0].value;
    }
  },
  { immediate: true },
);

const hasActive = computed(() =>
  operations.value.some((op) => op.status === 'pending' || op.status === 'processing'),
);

function resourceLabel(resource: string): string {
  return (
    {
      members: 'Miembros',
      branches: 'Sedes',
      analyses: 'Análisis',
      audit: 'Auditoría',
      analyses_summary: 'Reporte de análisis',
    }[resource] ?? resource
  );
}

function kindLabel(kind: OperationKind): string {
  return { export: 'Exportación', report: 'Reporte', import: 'Importación' }[kind] ?? kind;
}

function statusLabel(status: OperationStatus): string {
  return {
    pending: 'Pendiente',
    processing: 'Procesando',
    ready: 'Lista',
    failed: 'Fallida',
  }[status];
}

function statusVariant(status: OperationStatus) {
  return {
    pending: 'neutral',
    processing: 'info',
    ready: 'success',
    failed: 'danger',
  }[status] as 'neutral' | 'info' | 'success' | 'danger';
}

async function load() {
  try {
    const response = await operationsService.list();
    operations.value = response.data;
    error.value = null;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudieron cargar las operaciones');
  } finally {
    isLoading.value = false;
  }
}

async function requestExport() {
  if (!exportResource.value) return;
  busy.value = 'export';
  error.value = null;
  try {
    await operationsService.requestExport(exportResource.value, exportFormat.value);
    toast.success('Exportación encolada');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo encolar la exportación');
  } finally {
    busy.value = null;
  }
}

async function requestReport() {
  busy.value = 'report';
  error.value = null;
  try {
    await operationsService.requestAnalysesReport(exportFormat.value);
    toast.success('Reporte encolado');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo encolar el reporte');
  } finally {
    busy.value = null;
  }
}

async function importBranches() {
  if (!importFile.value) return;
  busy.value = 'import';
  error.value = null;
  try {
    await operationsService.importBranchesFile(importFile.value);
    importFile.value = null;
    toast.success('Importación encolada');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo encolar la importación');
  } finally {
    busy.value = null;
  }
}

async function download(operation: Operation) {
  downloadingId.value = operation.id;
  try {
    const file = await operationsService.download(operation.id);
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo descargar el archivo');
  } finally {
    downloadingId.value = null;
  }
}

onMounted(async () => {
  await load();
  pollTimer = setInterval(() => {
    if (hasActive.value) void load();
  }, 4000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.operations-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.operation-forms {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
}

.operation-card-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.operation-card-description {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.operation-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.operation-report {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.operation-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.import-button {
  margin-top: var(--space-3);
}

.operations-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.operations-history-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.operations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.operation-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.operation-item-title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-main);
}

.operation-item-meta {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.operation-error {
  margin: var(--space-3) 0 0;
  font-size: var(--text-sm);
  color: var(--color-danger-text);
}

.operation-result {
  margin: var(--space-3) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.operation-item-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}
</style>
