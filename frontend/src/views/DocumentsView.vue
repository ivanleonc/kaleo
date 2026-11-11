<template>
  <AuthenticatedLayout>
    <div class="documents-container">
      <UiPageHeader
        title="Documentos"
        subtitle="Archivos de la empresa con versiones, checksum y control de acceso."
      >
        <template #actions>
          <UiButton
            v-if="!entitlementsStore.isReadOnly"
            v-permission="Permissions.DOCUMENTS.CREATE"
            width="auto"
            @click="openUpload"
          >
            <IconUpload :size="16" /> Subir documento
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
      <UiAlert v-if="entitlementsStore.isReadOnly" type="warning">
        La suscripción está vencida: puedes consultar y descargar documentos, pero no crear,
        modificar ni eliminar hasta renovar el plan.
      </UiAlert>

      <UiCard>
        <div class="documents-toolbar">
          <div class="documents-search">
            <UiSearchInput
              v-model="filters.search"
              placeholder="Buscar por título o archivo..."
              aria-label="Buscar documentos"
            />
          </div>
          <UiSelect
            v-model="filters.category"
            :options="categoryOptions"
            placeholder="Categoría"
            aria-label="Filtrar por categoría"
          />
          <UiSelect
            v-model="filters.status"
            :options="statusOptions"
            :clearable="false"
            aria-label="Filtrar por estado"
          />
        </div>

        <div v-if="isLoading && documents.length === 0" class="documents-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
        </div>

        <UiEmptyState
          v-else-if="documents.length === 0"
          title="No hay documentos"
          description="Sube el primer archivo para compartirlo con tu equipo."
        >
          <template #icon>
            <IconFileText :size="48" stroke-width="1.5" />
          </template>
          <template #action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.DOCUMENTS.CREATE"
              width="auto"
              @click="openUpload"
            >
              Subir documento
            </UiButton>
          </template>
        </UiEmptyState>

        <ul v-else class="documents-list">
          <li v-for="document in documents" :key="document.id" class="document-row">
            <span class="document-icon" aria-hidden="true">
              <IconFileText :size="20" stroke-width="1.8" />
            </span>

            <div class="document-copy">
              <div class="document-title-row">
                <h3 class="document-title">{{ document.title }}</h3>
                <UiBadge :label="`v${document.current_version}`" variant="neutral" size="sm" />
                <UiBadge
                  v-if="document.status === 'archived'"
                  label="Archivado"
                  variant="warning"
                  size="sm"
                />
                <UiBadge v-if="document.links_count > 0" :label="`${document.links_count} vínculos`" variant="info" size="sm" />
              </div>
              <p class="document-meta">
                {{ document.filename || 'Sin archivo' }}
                <span v-if="document.size_bytes"> · {{ formatFileSize(document.size_bytes) }}</span>
                <span v-if="document.category"> · {{ document.category }}</span>
                <span> · {{ formatRelativeTime(document.updated_at) }}</span>
              </p>
              <p v-if="document.description" class="document-description">{{ document.description }}</p>
            </div>

            <div class="document-actions">
              <UiButton size="sm" variant="ghost" width="auto" @click="download(document)">
                Descargar
              </UiButton>
              <UiButton size="sm" variant="ghost" width="auto" @click="openDetail(document)">
                Versiones
              </UiButton>
              <UiButton
                v-if="!entitlementsStore.isReadOnly && document.status === 'active'"
                v-permission="Permissions.DOCUMENTS.UPDATE"
                size="sm"
                variant="ghost"
                width="auto"
                @click="setStatus(document, 'archived')"
              >
                Archivar
              </UiButton>
              <UiButton
                v-else-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.DOCUMENTS.UPDATE"
                size="sm"
                variant="ghost"
                width="auto"
                @click="setStatus(document, 'active')"
              >
                Restaurar
              </UiButton>
              <UiButton
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.DOCUMENTS.DELETE"
                size="sm"
                variant="ghost"
                width="auto"
                class="danger-action"
                @click="confirmDelete(document)"
              >
                Eliminar
              </UiButton>
            </div>
          </li>
        </ul>

        <UiPagination
          v-if="total > 0"
          :page="page"
          :limit="limit"
          :total="total"
          show-page-size
          @update:page="page = $event"
          @update:limit="limit = $event; page = 1"
        />
      </UiCard>
    </div>

    <UiFormModal
      v-model="isUploadOpen"
      title="Subir documento"
      description="El archivo se guarda en almacenamiento privado; la descarga se autoriza por el backend."
      submit-label="Subir"
      :loading="isUploading"
      :confirm-on-dirty="true"
      :dirty="Boolean(uploadFile) || Boolean(uploadForm.title) || Boolean(uploadForm.description)"
      @submit="submitUpload"
    >
      <UiAlert v-if="uploadError" type="error">{{ uploadError }}</UiAlert>
      <UiFileDropzone v-model="uploadFile" label="Archivo" :max-size="MAX_FILE_BYTES" />
      <div class="form-grid">
        <UiInput v-model="uploadForm.title" label="Título" placeholder="Se usa el nombre del archivo si lo dejas vacío" />
        <UiInput v-model="uploadForm.category" label="Categoría" placeholder="Contrato, factura, informe..." />
        <UiTextarea v-model="uploadForm.description" label="Descripción" class="span-2" />
        <UiInput v-model="uploadForm.entityType" label="Vincular a (tipo)" placeholder="analysis, member, branch..." />
        <UiInput v-model="uploadForm.entityId" label="ID de la entidad" placeholder="UUID" />
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isDetailOpen"
      title="Versiones del documento"
      size="large"
      :hide-footer="true"
    >
      <div v-if="isLoadingDetail" class="documents-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="200px" />
        <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
      </div>
      <template v-else-if="detail">
        <div class="detail-summary">
          <div>
            <h3 class="document-title">{{ detail.document.title }}</h3>
            <p class="document-meta">
              {{ detail.document.category || 'Sin categoría' }} ·
              {{ detail.versions.length }} versiones
            </p>
          </div>
        </div>

        <ul class="version-list">
          <li v-for="version in detail.versions" :key="version.id" class="version-row">
            <div>
              <strong>v{{ version.version }}</strong>
              <span class="version-meta">
                {{ version.filename }} · {{ formatFileSize(version.size_bytes) }} ·
                {{ formatRelativeTime(version.created_at) }}
              </span>
            </div>
            <UiButton size="sm" variant="ghost" width="auto" @click="downloadVersion(version)">
              Descargar
            </UiButton>
          </li>
        </ul>

        <div v-if="detail.links.length > 0" class="detail-links">
          <h4>Vínculos</h4>
          <ul>
            <li v-for="link in detail.links" :key="link.id">
              {{ link.entity_type }} · {{ link.entity_id }}
            </li>
          </ul>
        </div>

        <div
          v-if="detail.document.status === 'active' && !entitlementsStore.isReadOnly"
          v-permission="Permissions.DOCUMENTS.CREATE"
          class="version-upload"
        >
          <h4>Subir nueva versión</h4>
          <UiAlert v-if="versionError" type="error">{{ versionError }}</UiAlert>
          <UiFileDropzone v-model="versionFile" label="Archivo" :max-size="MAX_FILE_BYTES" />
          <UiButton
            width="auto"
            :loading="isUploadingVersion"
            :disabled="!versionFile"
            @click="submitVersion"
          >
            Subir versión
          </UiButton>
        </div>
      </template>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Eliminar documento"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeDocument"
    >
      ¿Eliminar <strong>{{ deleteTarget?.title }}</strong> y todas sus versiones? Esta acción no se
      puede deshacer.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiTextarea from '@/components/ui/UiTextarea.vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import { IconFileText, IconUpload } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { documentService } from '@/services/document.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/number';
import { formatRelativeTime } from '@/utils/date';
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentStatus,
  DocumentVersion,
} from '@/types/document';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const documents = ref<DocumentListItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const error = ref<string | null>(null);

const filters = reactive({
  search: '',
  category: '',
  status: '' as '' | DocumentStatus,
});

const categoryOptions = computed(() => {
  const values = Array.from(
    new Set(documents.value.map((document) => document.category).filter(Boolean)),
  ) as string[];
  return [
    { label: 'Todas las categorías', value: '' },
    ...values.map((value) => ({ label: value, value })),
  ];
});

const statusOptions = [
  { label: 'Todos los estados', value: '' },
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
];

let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await documentService.list({
      search: filters.search || undefined,
      category: filters.category || undefined,
      status: filters.status || undefined,
      page: page.value,
      limit: limit.value,
    });
    documents.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar los documentos');
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => filters.search,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      void load();
    }, 300);
  },
);

watch(
  () => [filters.category, filters.status],
  () => {
    page.value = 1;
    void load();
  },
);

watch([page, limit], () => void load());

// --- Upload ---
const isUploadOpen = ref(false);
const uploadFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadError = ref('');
const uploadForm = reactive({
  title: '',
  description: '',
  category: '',
  entityType: '',
  entityId: '',
});

function openUpload(): void {
  uploadFile.value = null;
  uploadForm.title = '';
  uploadForm.description = '';
  uploadForm.category = '';
  uploadForm.entityType = '';
  uploadForm.entityId = '';
  uploadError.value = '';
  isUploadOpen.value = true;
}

async function submitUpload(): Promise<void> {
  if (!uploadFile.value) {
    uploadError.value = 'Selecciona un archivo.';
    return;
  }
  if (Boolean(uploadForm.entityType) !== Boolean(uploadForm.entityId)) {
    uploadError.value = 'El tipo y el ID de la entidad deben enviarse juntos.';
    return;
  }

  isUploading.value = true;
  uploadError.value = '';
  try {
    await documentService.upload({
      file: uploadFile.value,
      title: uploadForm.title || undefined,
      description: uploadForm.description || undefined,
      category: uploadForm.category || undefined,
      entityType: uploadForm.entityType || undefined,
      entityId: uploadForm.entityId || undefined,
    });
    isUploadOpen.value = false;
    toast.success('Documento subido');
    await load();
  } catch (err) {
    uploadError.value = apiErrorMessage(err, 'No pudimos subir el documento');
  } finally {
    isUploading.value = false;
  }
}

// --- Download ---
async function download(item: DocumentListItem | DocumentVersion): Promise<void> {
  const documentId = 'document_id' in item ? item.document_id : item.id;
  const version = 'version' in item ? item.version : undefined;
  try {
    const file = await documentService.download(documentId, version);
    const url = URL.createObjectURL(file.blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos descargar el documento'));
  }
}

// --- Detail / versions ---
const isDetailOpen = ref(false);
const isLoadingDetail = ref(false);
const detail = ref<DocumentDetail | null>(null);
const versionFile = ref<File | null>(null);
const isUploadingVersion = ref(false);
const versionError = ref('');

async function openDetail(document: DocumentListItem): Promise<void> {
  isDetailOpen.value = true;
  isLoadingDetail.value = true;
  detail.value = null;
  versionFile.value = null;
  versionError.value = '';
  try {
    detail.value = (await documentService.get(document.id)).data;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar el documento'));
    isDetailOpen.value = false;
  } finally {
    isLoadingDetail.value = false;
  }
}

async function submitVersion(): Promise<void> {
  if (!versionFile.value || !detail.value) {
    versionError.value = 'Selecciona un archivo.';
    return;
  }

  isUploadingVersion.value = true;
  versionError.value = '';
  try {
    await documentService.addVersion(detail.value.document.id, versionFile.value);
    versionFile.value = null;
    detail.value = (await documentService.get(detail.value.document.id)).data;
    toast.success('Versión subida');
    await load();
  } catch (err) {
    versionError.value = apiErrorMessage(err, 'No pudimos subir la versión');
  } finally {
    isUploadingVersion.value = false;
  }
}

function downloadVersion(version: DocumentVersion): void {
  void download(version);
}

// --- Status / delete ---
async function setStatus(
  document: DocumentListItem,
  status: DocumentStatus,
): Promise<void> {
  try {
    await documentService.update(document.id, { status });
    toast.success(status === 'archived' ? 'Documento archivado' : 'Documento restaurado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos actualizar el documento'));
  }
}

const isDeleteOpen = ref(false);
const deleteTarget = ref<DocumentListItem | null>(null);
const isDeleting = ref(false);

function confirmDelete(document: DocumentListItem): void {
  deleteTarget.value = document;
  isDeleteOpen.value = true;
}

async function removeDocument(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await documentService.remove(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Documento eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el documento'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.documents-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.documents-toolbar {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(160px, 220px) minmax(150px, 190px);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.documents-search {
  min-width: 0;
}

.documents-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.documents-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.document-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.document-row + .document-row {
  border-top: 1px solid var(--border);
}

.document-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--primary);
  flex-shrink: 0;
}

.document-copy {
  min-width: 0;
  flex: 1;
}

.document-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.document-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow-wrap: anywhere;
}

.document-meta {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.document-description {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.document-actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.danger-action {
  color: var(--color-danger);
}

.detail-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.version-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border);
}

.version-meta {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.detail-links {
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.detail-links h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
}

.detail-links ul {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.version-upload {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.version-upload h4 {
  margin: 0;
  font-size: var(--text-sm);
}

@media (max-width: 800px) {
  .documents-toolbar {
    grid-template-columns: 1fr;
  }

  .document-row {
    flex-wrap: wrap;
  }

  .document-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(36px + var(--space-3));
  }
}
</style>
