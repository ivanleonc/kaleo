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
            v-if="project?.budget_id"
            width="auto"
            @click="openBudget"
          >
            <IconCalculator :size="16" /> Presupuesto
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

          <UiCard v-for="future in FUTURE_CARDS" :key="future.title" class="workspace-card is-disabled">
            <div class="workspace-card-head">
              <span class="workspace-card-icon icon-neutral"><component :is="future.icon" :size="22" /></span>
              <UiBadge label="Próximamente" variant="neutral" size="sm" />
            </div>
            <h3>{{ future.title }}</h3>
            <p>{{ future.description }}</p>
          </UiCard>
        </div>
      </template>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiMetricCard from '@/components/ui/UiMetricCard.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import {
  IconArrowLeft,
  IconCalculator,
  IconFileText,
  IconHistory,
  IconListNumbers,
  IconStack2,
  IconUserCircle,
  IconUsers,
  IconCalendar,
  IconContract,
  IconCash,
  IconPackage,
} from '@tabler/icons-vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { projectService } from '@/services/project.service';
import { formatDate } from '@/utils/date';
import { apiErrorMessage } from '@/utils/error';
import type { ProjectDetail, ProjectStatus } from '@/types/project';

const route = useRoute();
const router = useRouter();
const { companyPath } = useCompanyPath();

const projectId = computed(() => String(route.params.projectId ?? ''));
const project = ref<ProjectDetail | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const FUTURE_CARDS = [
  { title: 'Programación', description: 'Cronograma y dependencias de actividades.', icon: IconCalendar },
  { title: 'Contratos', description: 'Contratos de obra y subcontratos.', icon: IconContract },
  { title: 'Nómina', description: 'Mano de obra y pagos del proyecto.', icon: IconCash },
  { title: 'Almacén', description: 'Requisiciones, órdenes y entradas.', icon: IconPackage },
];

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
</style>
