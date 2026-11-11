<template>
  <AuthenticatedLayout>
    <div class="projects-container">
      <UiPageHeader
        title="Proyectos"
        subtitle="Obras y servicios con cliente, equipo, fechas y moneda."
      >
        <template #actions>
          <UiButton
            v-if="!entitlementsStore.isReadOnly"
            v-permission="Permissions.PROJECTS.CREATE"
            width="auto"
            @click="openCreate"
          >
            <IconPlus :size="16" /> Nuevo proyecto
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
      <UiAlert v-if="entitlementsStore.isReadOnly" type="warning">
        La suscripción está vencida: puedes consultar proyectos, pero no modificarlos hasta
        renovar el plan.
      </UiAlert>

      <UiCard>
        <div class="projects-toolbar">
          <UiSearchInput v-model="filters.search" placeholder="Buscar por código, nombre o cliente..." aria-label="Buscar proyectos" />
          <UiSelect v-model="filters.status" :options="statusFilterOptions" :clearable="false" aria-label="Filtrar por estado" />
        </div>

        <div v-if="isLoading" class="projects-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
        </div>

        <UiEmptyState
          v-else-if="projects.length === 0"
          title="No hay proyectos"
          description="Crea un proyecto para empezar a estimar y controlar costos."
        >
          <template #icon>
            <IconFolders :size="48" stroke-width="1.5" />
          </template>
          <template #action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.PROJECTS.CREATE"
              width="auto"
              @click="openCreate"
            >
              Crear proyecto
            </UiButton>
          </template>
        </UiEmptyState>

        <ul v-else class="projects-list">
          <li v-for="project in projects" :key="project.id" class="project-row">
            <span class="project-badge">{{ project.code }}</span>
            <div class="project-copy">
              <div class="project-title-row">
                <h3>{{ project.name }}</h3>
                <UiBadge :label="statusLabel(project.status)" :variant="statusVariant(project.status)" size="sm" />
                <UiBadge :label="project.currency_code" size="sm" />
              </div>
              <p class="project-meta">
                <span v-if="project.client_name">Cliente: {{ project.client_name }}</span>
                <span v-if="project.branch_name">Sede: {{ project.branch_name }}</span>
                <span>{{ project.members_count }} miembros</span>
                <span v-if="project.start_date">Inicio: {{ formatDate(project.start_date) }}</span>
              </p>
            </div>
            <div class="project-actions">
              <UiButton size="sm" variant="ghost" width="auto" @click="openDetail(project)">
                Ver equipo
              </UiButton>
              <template v-if="!entitlementsStore.isReadOnly">
                <UiButton
                  v-permission="Permissions.PROJECTS.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openEdit(project)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-permission="Permissions.PROJECTS.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmDelete(project)"
                >
                  Eliminar
                </UiButton>
              </template>
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
      v-model="isFormOpen"
      :title="editing ? 'Editar proyecto' : 'Nuevo proyecto'"
      :submit-label="editing ? 'Guardar' : 'Crear proyecto'"
      :loading="isSaving"
      size="large"
      @submit="save"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="form.code" label="Código" required />
        <UiInput v-model="form.name" label="Nombre" required />
        <UiSelect v-model="form.status" label="Estado" :options="statusOptions" :clearable="false" />
        <UiSelect v-model="form.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
        <UiSelect v-model="form.branchId" label="Sede" :options="branchOptions" />
        <UiSelect v-model="form.clientPartyId" label="Cliente" :options="partyOptions" />
        <UiInput v-model="form.startDate" label="Inicio" type="date" />
        <UiInput v-model="form.endDate" label="Fin" type="date" />
        <UiInput v-model="form.timezone" label="Zona horaria" placeholder="America/Bogota" />
        <UiInput v-model="form.address" label="Dirección" />
        <UiTextarea v-model="form.description" label="Descripción" class="span-2" />
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isDetailOpen"
      :title="detail ? `${detail.code} · ${detail.name}` : 'Proyecto'"
      size="large"
      :hide-footer="true"
    >
      <div v-if="isLoadingDetail" class="projects-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="200px" />
        <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
      </div>

      <template v-else-if="detail">
        <div class="detail-summary">
          <div>
            <p class="project-meta">
              <span v-if="detail.client_name">Cliente: {{ detail.client_name }}</span>
              <span v-if="detail.branch_name">Sede: {{ detail.branch_name }}</span>
              <span>{{ detail.currency_code }}</span>
              <span v-if="detail.start_date">{{ formatDate(detail.start_date) }} → {{ detail.end_date ? formatDate(detail.end_date) : 'sin fin' }}</span>
            </p>
            <p v-if="detail.address" class="project-meta">{{ detail.address }}</p>
          </div>
          <UiBadge :label="statusLabel(detail.status)" :variant="statusVariant(detail.status)" />
        </div>

        <section class="detail-section">
          <h4>Equipo del proyecto</h4>
          <ul class="member-list">
            <li v-for="member in detail.members" :key="member.membership_id" class="member-row">
              <div>
                <strong>{{ member.user_name }}</strong>
                <span class="member-meta">{{ member.user_email }} · {{ roleLabel(member.project_role) }}</span>
              </div>
              <UiButton
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PROJECTS.UPDATE"
                size="sm"
                variant="ghost"
                width="auto"
                class="danger-action"
                @click="removeMember(member.membership_id)"
              >
                Quitar
              </UiButton>
            </li>
            <li v-if="detail.members.length === 0" class="member-empty">Sin miembros asignados.</li>
          </ul>

          <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.PROJECTS.UPDATE" class="inline-form">
            <UiSelect v-model="newMember.userId" :options="memberOptions" placeholder="Miembro" :clearable="false" />
            <UiSelect v-model="newMember.projectRole" :options="roleOptions" :clearable="false" />
            <UiButton
              size="sm"
              variant="outline"
              width="auto"
              :disabled="!newMember.userId"
              @click="addMember"
            >
              Agregar
            </UiButton>
          </div>
        </section>
      </template>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Eliminar proyecto"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeProject"
    >
      ¿Eliminar <strong>{{ deleteTarget?.name }}</strong>? Los documentos y datos asociados no se
      borrarán, pero el proyecto dejará de estar disponible.
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
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import { IconFolders, IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { projectService } from '@/services/project.service';
import { branchService } from '@/services/branch.service';
import { partyService } from '@/services/party.service';
import { catalogService } from '@/services/catalog.service';
import { memberService } from '@/services/member.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import type { Branch } from '@/types/branch';
import type { PartyListItem } from '@/types/party';
import type { Currency } from '@/types/catalog';
import type { Member } from '@/types/member';
import type {
  CreateProjectPayload,
  Project,
  ProjectDetail,
  ProjectRole,
  ProjectStatus,
} from '@/types/project';

const STATUS_OPTIONS = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Activo', value: 'active' },
  { label: 'En pausa', value: 'on_hold' },
  { label: 'Completado', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
] as const;

const ROLE_OPTIONS = [
  { label: 'Gerente', value: 'manager' },
  { label: 'Estimador', value: 'estimator' },
  { label: 'Residente', value: 'resident' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Lector', value: 'viewer' },
] as const;

const statusOptions = [...STATUS_OPTIONS];
const statusFilterOptions = [{ label: 'Todos los estados', value: '' }, ...STATUS_OPTIONS];
const roleOptions = [...ROLE_OPTIONS];

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const projects = ref<Project[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const error = ref<string | null>(null);

const branches = ref<Branch[]>([]);
const parties = ref<PartyListItem[]>([]);
const currencies = ref<Currency[]>([]);
const members = ref<Member[]>([]);

const filters = reactive({
  search: '',
  status: '' as '' | ProjectStatus,
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

const branchOptions = computed(() => [
  { label: 'Sin sede', value: '' },
  ...branches.value.map((branch) => ({ label: branch.name, value: branch.id })),
]);
const partyOptions = computed(() => [
  { label: 'Sin cliente', value: '' },
  ...parties.value.map((party) => ({
    label: `${party.name}${party.tax_id ? ` · ${party.tax_id}` : ''}`,
    value: party.id,
  })),
]);
const currencyOptions = computed(() =>
  currencies.value.map((currency) => ({ label: `${currency.code} · ${currency.name}`, value: currency.code })),
);
const memberOptions = computed(() =>
  members.value.map((member) => ({ label: `${member.name} · ${member.email}`, value: member.id })),
);

function statusLabel(status: ProjectStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusVariant(status: ProjectStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'on_hold') return 'warning';
  if (status === 'completed') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'neutral';
}

function roleLabel(role: ProjectRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await projectService.list({
      search: filters.search || undefined,
      status: filters.status || undefined,
      page: page.value,
      limit: limit.value,
    });
    projects.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar los proyectos');
  } finally {
    isLoading.value = false;
  }
}

async function loadLookups(): Promise<void> {
  const [branchResponse, partyResponse, currencyData, memberResponse] = await Promise.all([
    branchService.getBranches({ limit: 100 }),
    partyService.list({ limit: 100 }),
    catalogService.getCurrencies(),
    memberService.getMembers({ limit: 100 }),
  ]);
  branches.value = branchResponse.data;
  parties.value = partyResponse.data;
  currencies.value = currencyData;
  members.value = memberResponse.data;
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
watch(() => filters.status, () => {
  page.value = 1;
  void load();
});
watch([page, limit], () => void load());

// --- Formulario ---
const isFormOpen = ref(false);
const editing = ref<Project | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({
  code: '',
  name: '',
  description: '',
  status: 'draft' as ProjectStatus,
  branchId: '',
  clientPartyId: '',
  currencyCode: 'COP',
  startDate: '',
  endDate: '',
  timezone: 'America/Bogota',
  address: '',
});

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    code: '',
    name: '',
    description: '',
    status: 'draft',
    branchId: '',
    clientPartyId: '',
    currencyCode: currencies.value.find((currency) => currency.code === 'COP')?.code ?? currencies.value[0]?.code ?? 'COP',
    startDate: '',
    endDate: '',
    timezone: 'America/Bogota',
    address: '',
  });
  formError.value = null;
  isFormOpen.value = true;
}

function openEdit(project: Project): void {
  editing.value = project;
  Object.assign(form, {
    code: project.code,
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    branchId: project.branch_id ?? '',
    clientPartyId: project.client_party_id ?? '',
    currencyCode: project.currency_code,
    startDate: project.start_date ?? '',
    endDate: project.end_date ?? '',
    timezone: project.timezone ?? '',
    address: project.address ?? '',
  });
  formError.value = null;
  isFormOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.code.trim() || !form.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  const payload: CreateProjectPayload = {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    status: form.status,
    branchId: form.branchId || null,
    clientPartyId: form.clientPartyId || null,
    currencyCode: form.currencyCode,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    timezone: form.timezone.trim() || null,
    address: form.address.trim() || null,
  };
  try {
    if (editing.value) {
      await projectService.update(editing.value.id, payload);
      toast.success('Proyecto actualizado');
    } else {
      await projectService.create(payload);
      toast.success('Proyecto creado');
    }
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el proyecto');
  } finally {
    isSaving.value = false;
  }
}

// --- Detalle / equipo ---
const isDetailOpen = ref(false);
const isLoadingDetail = ref(false);
const detail = ref<ProjectDetail | null>(null);
const newMember = reactive({ userId: '', projectRole: 'viewer' as ProjectRole });

async function openDetail(project: Project): Promise<void> {
  isDetailOpen.value = true;
  isLoadingDetail.value = true;
  detail.value = null;
  newMember.userId = '';
  newMember.projectRole = 'viewer';
  try {
    detail.value = await projectService.get(project.id);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar el proyecto'));
    isDetailOpen.value = false;
  } finally {
    isLoadingDetail.value = false;
  }
}

async function addMember(): Promise<void> {
  if (!detail.value || !newMember.userId) return;
  try {
    await projectService.addMember(detail.value.id, {
      userId: newMember.userId,
      projectRole: newMember.projectRole,
    });
    detail.value = await projectService.get(detail.value.id);
    newMember.userId = '';
    toast.success('Miembro agregado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el miembro'));
  }
}

async function removeMember(membershipId: string): Promise<void> {
  if (!detail.value) return;
  try {
    await projectService.removeMember(detail.value.id, membershipId);
    detail.value = await projectService.get(detail.value.id);
    toast.success('Miembro eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos quitar el miembro'));
  }
}

// --- Eliminar ---
const isDeleteOpen = ref(false);
const deleteTarget = ref<Project | null>(null);
const isDeleting = ref(false);

function confirmDelete(project: Project): void {
  deleteTarget.value = project;
  isDeleteOpen.value = true;
}

async function removeProject(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await projectService.remove(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Proyecto eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el proyecto'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([load(), loadLookups()]);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.projects-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.projects-toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(160px, 220px);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.projects-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.projects-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.project-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.project-row + .project-row {
  border-top: 1px solid var(--border);
}

.project-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 32px;
  padding: 0 var(--space-2);
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--primary);
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.project-copy {
  min-width: 0;
  flex: 1;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.project-title-row h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.project-actions {
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
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.detail-section h4 {
  margin: 0;
  font-size: var(--text-sm);
}

.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.member-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
}

.member-row:first-child {
  border-top: none;
}

.member-meta {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.member-empty {
  padding: var(--space-3) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.inline-form {
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 800px) {
  .projects-toolbar {
    grid-template-columns: 1fr;
  }

  .project-row {
    flex-wrap: wrap;
  }

  .project-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(64px + var(--space-3));
  }
}
</style>
