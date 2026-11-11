<template>
  <AuthenticatedLayout>
    <div class="project-workspace">
      <UiPageHeader
        :title="project?.name || 'Proyecto'"
        :subtitle="project ? `${project.code} · ${project.client_name || 'Sin cliente'}` : 'Cargando proyecto…'"
      >
        <template #actions>
          <UiButton variant="ghost" width="auto" @click="router.push(companyPath('/projects'))">
            <IconArrowLeft :size="16" /> Proyectos
          </UiButton>
          <UiButton
            v-permission="Permissions.EXECUTION.READ"
            variant="outline"
            width="auto"
            @click="openExecution"
          >
            <IconTimeline :size="16" /> Ejecución
          </UiButton>
          <UiButton
            v-if="project?.budget_id"
            width="auto"
            @click="openBudget"
          >
            <IconCalculator :size="16" /> Presupuesto
          </UiButton>
          <UiButton
            v-permission="Permissions.PROJECTS.SHARE"
            variant="outline"
            width="auto"
            @click="openShares"
          >
            <IconShare3 :size="16" /> Compartir
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div v-if="isLoading" class="workspace-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="260px" />
        <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
      </div>

      <template v-else-if="project">
        <div class="workspace-cover" :style="coverStyle">
          <div class="workspace-cover-content">
            <div class="workspace-cover-badges">
              <UiBadge :label="statusLabel(project.status)" :variant="statusVariant(project.status)" />
              <UiBadge v-if="project.category" :label="project.category" />
              <UiBadge :label="project.currency_code" />
            </div>
            <p class="workspace-cover-meta">
              {{ project.client_name || 'Sin cliente' }} · {{ project.branch_name || 'Sin sede' }}
            </p>
            <p v-if="project.start_date" class="workspace-cover-meta">
              {{ formatDate(project.start_date) }} → {{ project.end_date ? formatDate(project.end_date) : 'sin fin' }}
            </p>
          </div>
        </div>

        <div class="workspace-metrics">
          <UiMetricCard title="Presupuesto" :value="formatMoney(project.budget_total, project.currency_code)" color="green">
            <template #icon><IconCalculator :size="18" /></template>
          </UiMetricCard>
          <UiMetricCard title="Actividades" :value="project.activity_count" color="blue">
            <template #icon><IconListNumbers :size="18" /></template>
          </UiMetricCard>
          <UiMetricCard title="Equipo" :value="project.members_count" color="orange">
            <template #icon><IconUsers :size="18" /></template>
          </UiMetricCard>
          <UiMetricCard title="Creador" :value="project.creator_name || project.creator_email || '—'" color="purple">
            <template #icon><IconUserCircle :size="18" /></template>
          </UiMetricCard>
        </div>

        <div class="workspace-grid">
          <UiCard class="workspace-card" hoverable @click="openBudget">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-green"><IconCalculator :size="22" /></span>
              <UiBadge label="Planeación" size="sm" />
            </div>
            <h3>Presupuesto</h3>
            <p>Actividades, APUs, cantidades y costos indirectos.</p>
            <UiButton size="sm" variant="outline" width="auto" @click.stop="openBudget">
              {{ project.budget_id ? 'Abrir presupuesto' : 'Crear presupuesto' }}
            </UiButton>
          </UiCard>

          <UiCard class="workspace-card" hoverable @click="router.push(companyPath('/estimating'))">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-blue"><IconStack2 :size="22" /></span>
              <UiBadge label="Estimación" size="sm" />
            </div>
            <h3>Insumos y APUs</h3>
            <p>Recursos, rendimientos y análisis de precios unitarios.</p>
            <UiButton size="sm" variant="outline" width="auto" @click.stop="router.push(companyPath('/estimating'))">
              Abrir estimación
            </UiButton>
          </UiCard>

          <UiCard class="workspace-card">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-purple"><IconFileText :size="22" /></span>
              <UiBadge label="Documentos" size="sm" />
            </div>
            <h3>Anexos y documentos</h3>
            <p>Planos, contratos y soportes del proyecto.</p>
            <UiButton size="sm" variant="outline" width="auto" @click="router.push(companyPath('/documents'))">
              Ver documentos
            </UiButton>
          </UiCard>

          <UiCard class="workspace-card">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-orange"><IconHistory :size="22" /></span>
              <UiBadge label="Control" size="sm" />
            </div>
            <h3>Bitácora y auditoría</h3>
            <p>Historial de cambios y actividad del proyecto.</p>
            <UiButton size="sm" variant="outline" width="auto" @click="router.push(companyPath('/audit'))">
              Ver auditoría
            </UiButton>
          </UiCard>

          <UiCard class="workspace-card" hoverable @click="openExecution">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-orange"><IconTimeline :size="22" /></span>
              <UiBadge label="Ejecución" size="sm" />
            </div>
            <h3>Ejecución de obra</h3>
            <p>Programación, contratos, nómina, almacén y compras.</p>
            <UiButton size="sm" variant="outline" width="auto" @click.stop="openExecution">
              Abrir ejecución
            </UiButton>
          </UiCard>
        </div>
      </template>
    </div>

    <UiFormModal
      v-model="isShareOpen"
      title="Compartir proyecto"
      description="Enlaces públicos de solo lectura para clientes o interventoría."
      size="large"
      :hide-footer="true"
    >
      <UiAlert v-if="shareError" type="error">{{ shareError }}</UiAlert>

      <div class="share-form">
        <UiInput v-model="shareForm.label" label="Etiqueta" placeholder="Cliente, interventoría…" />
        <UiSelect
          v-model="shareForm.scope"
          label="Alcance"
          :options="shareScopeOptions"
          :clearable="false"
        />
        <UiInput
          v-model="shareForm.expiresInDays"
          label="Expira en días (1-365)"
          type="number"
        />
        <UiButton width="auto" :loading="isCreatingShare" @click="createShare">
          <IconLink :size="16" /> Crear enlace
        </UiButton>
      </div>

      <UiAlert v-if="createdShareUrl" type="success">
        Enlace creado. Cópialo ahora; por seguridad no se volverá a mostrar.
        <div class="share-created">
          <code>{{ createdShareUrl }}</code>
          <UiButton size="sm" variant="outline" width="auto" @click="copyShareUrl(createdShareUrl)">
            <IconCopy :size="15" /> Copiar
          </UiButton>
        </div>
      </UiAlert>

      <div v-if="isLoadingShares" class="workspace-loading" aria-hidden="true">
        <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
      </div>
      <ul v-else class="share-list">
        <li v-for="link in shares" :key="link.id" class="share-row">
          <div class="share-copy">
            <strong>{{ link.label || 'Sin etiqueta' }}</strong>
            <span>
              {{ shareScopeLabel(link.scope) }} ·
              {{ link.expires_at ? `Expira ${formatDate(link.expires_at)}` : 'Sin expiración' }} ·
              {{ link.views_count }} visitas
            </span>
          </div>
          <UiBadge
            :label="link.revoked_at ? 'Revocado' : 'Activo'"
            :variant="link.revoked_at ? 'neutral' : 'success'"
            size="sm"
          />
          <UiButton
            v-if="!link.revoked_at"
            v-permission="Permissions.PROJECTS.SHARE"
            size="sm"
            variant="ghost"
            width="auto"
            class="danger-action"
            @click="confirmRevokeShare(link)"
          >
            Revocar
          </UiButton>
        </li>
        <li v-if="shares.length === 0" class="share-empty">
          Aún no hay enlaces compartidos para este proyecto.
        </li>
      </ul>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isRevokeShareOpen"
      title="Revocar enlace"
      variant="danger"
      confirm-label="Revocar"
      :loading="isRevokingShare"
      @confirm="revokeShare"
    >
      El enlace dejará de funcionar inmediatamente y no se podrá reactivar.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiMetricCard from '@/components/ui/UiMetricCard.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import {
  IconArrowLeft,
  IconCalculator,
  IconCopy,
  IconFileText,
  IconHistory,
  IconLink,
  IconListNumbers,
  IconShare3,
  IconStack2,
  IconTimeline,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useToast } from '@/composables/useToast';
import { projectService } from '@/services/project.service';
import { shareService } from '@/services/share.service';
import { formatDate } from '@/utils/date';
import { apiErrorMessage } from '@/utils/error';
import { Permissions } from '@/constants/permissions';
import type { ProjectDetail, ProjectStatus } from '@/types/project';
import type { ShareLink, ShareScope } from '@/types/project-share';

const route = useRoute();
const router = useRouter();
const { companyPath } = useCompanyPath();

const toast = useToast();

const projectId = computed(() => String(route.params.projectId ?? ''));
const project = ref<ProjectDetail | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const shareScopeOptions = [
  { label: 'Resumen del proyecto', value: 'summary' },
  { label: 'Resumen + presupuesto', value: 'budget' },
];
const isShareOpen = ref(false);
const shares = ref<ShareLink[]>([]);
const isLoadingShares = ref(false);
const isCreatingShare = ref(false);
const isRevokingShare = ref(false);
const isRevokeShareOpen = ref(false);
const shareError = ref<string | null>(null);
const createdShareUrl = ref('');
const shareToRevoke = ref<ShareLink | null>(null);
const shareForm = reactive({
  label: '',
  scope: 'summary' as ShareScope,
  expiresInDays: '30',
});

const coverStyle = computed(() => {
  if (project.value?.cover_url) {
    return {
      backgroundImage: `linear-gradient(90deg, rgba(15,23,42,.72), rgba(15,23,42,.18)), url(${project.value.cover_url})`,
    };
  }
  return {
    backgroundImage:
      'linear-gradient(120deg, var(--primary-active), var(--bg-hover) 55%, var(--bg-app))',
  };
});

function statusLabel(status: ProjectStatus): string {
  return {
    draft: 'Borrador',
    active: 'Activo',
    on_hold: 'En pausa',
    completed: 'Completado',
    cancelled: 'Cancelado',
  }[status];
}

function statusVariant(status: ProjectStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'on_hold') return 'warning';
  if (status === 'completed') return 'info';
  return 'neutral';
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

function openBudget(): void {
  router.push(companyPath(`/projects/${projectId.value}/budget`));
}

function openExecution(): void {
  router.push(companyPath(`/projects/${projectId.value}/execution`));
}

// --- Enlaces compartidos ---
function shareScopeLabel(scope: ShareScope): string {
  return scope === 'budget' ? 'Resumen + presupuesto' : 'Resumen';
}

async function openShares(): Promise<void> {
  createdShareUrl.value = '';
  shareError.value = null;
  shareForm.label = '';
  shareForm.scope = 'summary';
  shareForm.expiresInDays = '30';
  isShareOpen.value = true;
  await loadShares();
}

async function loadShares(): Promise<void> {
  isLoadingShares.value = true;
  try {
    shares.value = await shareService.list(projectId.value);
  } catch (err) {
    shareError.value = apiErrorMessage(err, 'No pudimos cargar los enlaces');
  } finally {
    isLoadingShares.value = false;
  }
}

async function createShare(): Promise<void> {
  const days = Number(shareForm.expiresInDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    shareError.value = 'La expiración debe estar entre 1 y 365 días.';
    return;
  }
  isCreatingShare.value = true;
  shareError.value = null;
  createdShareUrl.value = '';
  try {
    const link = await shareService.create(projectId.value, {
      label: shareForm.label.trim() || null,
      scope: shareForm.scope,
      expiresInDays: days,
    });
    if (link.token) {
      createdShareUrl.value = `${window.location.origin}/share/${link.token}`;
    } else {
      toast.error('El enlace se creó, pero no se recibió el token para copiarlo');
    }
    await loadShares();
    toast.success('Enlace creado');
  } catch (err) {
    shareError.value = apiErrorMessage(err, 'No pudimos crear el enlace');
  } finally {
    isCreatingShare.value = false;
  }
}

async function copyShareUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  } catch {
    toast.error('No pudimos copiar el enlace; selecciónalo manualmente');
  }
}

function confirmRevokeShare(link: ShareLink): void {
  shareToRevoke.value = link;
  isRevokeShareOpen.value = true;
}

async function revokeShare(): Promise<void> {
  if (!shareToRevoke.value) return;
  isRevokingShare.value = true;
  try {
    await shareService.revoke(projectId.value, shareToRevoke.value.id);
    isRevokeShareOpen.value = false;
    shareToRevoke.value = null;
    await loadShares();
    toast.success('Enlace revocado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos revocar el enlace'));
  } finally {
    isRevokingShare.value = false;
  }
}

onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    project.value = await projectService.get(projectId.value);
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar el proyecto');
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.project-workspace {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.workspace-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.workspace-cover {
  min-height: 180px;
  border-radius: var(--radius-lg);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: var(--space-5);
  color: white;
}

.workspace-cover-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.workspace-cover-badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.workspace-cover-meta {
  margin: 0;
  font-size: var(--text-sm);
  color: rgba(255,255,255,.86);
}

.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--space-3);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: var(--space-3);
}

.workspace-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.workspace-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.workspace-card h3 {
  margin: 0;
  font-size: var(--text-sm);
}

.workspace-card p {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  min-height: 34px;
}

.workspace-card.is-disabled {
  opacity: .62;
}

.workspace-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
}

.icon-green { background: rgba(34,197,94,.12); color: #16a34a; }
.icon-blue { background: rgba(59,130,246,.12); color: #2563eb; }
.icon-purple { background: rgba(147,51,234,.12); color: #9333ea; }
.icon-orange { background: rgba(249,115,22,.12); color: #ea580c; }
.icon-neutral { background: var(--bg-hover); color: var(--text-muted); }

.share-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(170px, 210px) 150px auto;
  gap: var(--space-2);
  align-items: end;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.share-created {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.share-created code {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--bg-app);
  overflow-wrap: anywhere;
  font-size: var(--text-xs);
}

.share-list {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.share-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.share-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-sm);
}

.share-copy span {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.share-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 800px) {
  .share-form {
    grid-template-columns: 1fr;
  }
}
</style>
