<template>
  <AuthenticatedLayout>
    <div class="dashboard-content">
      <UiPageHeader
        title="Dashboard"
        :subtitle="welcomeSubtitle"
      />
      
      <div v-if="isLoading" class="metrics-grid" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="metric-skeleton">
          <UiSkeleton variant="avatar" />
          <div class="metric-skeleton-text">
            <UiSkeleton variant="text" width="55%" />
            <UiSkeleton variant="title" width="35%" />
          </div>
        </div>
      </div>

      <UiErrorState v-else-if="loadError" :description="loadError" @retry="loadData" />

      <template v-else>
        <div class="metrics-grid">
          <router-link :to="companyPath('/members')" class="metric-link" v-permission="Permissions.USERS.READ">
            <DashboardMetricCard
              title="Miembros Activos"
              :value="activeMembers"
              :trendText="`De un total de ${totalMembers}`"
              :trendType="activeMembers > 0 ? 'positive' : 'neutral'"
              color="blue"
            >
              <template #icon>
                <IconUsers :size="20" stroke-width="2" />
              </template>
            </DashboardMetricCard>
          </router-link>

          <router-link :to="companyPath('/roles')" class="metric-link" v-permission="Permissions.ROLES.READ">
            <DashboardMetricCard
              title="Roles de Acceso"
              :value="totalRoles"
              trendText="Niveles de permisos"
              color="purple"
            >
              <template #icon>
                <IconShieldLock :size="20" stroke-width="2" />
              </template>
            </DashboardMetricCard>
          </router-link>

          <router-link :to="companyPath('/settings')" class="metric-link" v-permission="Permissions.SETTINGS.READ">
            <DashboardMetricCard
              title="Empresa Actual"
              :value="activeCompanyName"
              :trendText="activeCompanyRole"
              color="green"
              isText
            >
              <template #icon>
                <IconBuildingStore :size="20" stroke-width="2" />
              </template>
            </DashboardMetricCard>
          </router-link>

          <router-link :to="companyPath('/profile')" class="metric-link">
            <DashboardMetricCard
              title="Estado"
              :value="authStore.user?.email_verified ? 'Verificada' : 'Pendiente'"
              trendText="Cuenta de email"
              :color="authStore.user?.email_verified ? 'green' : 'orange'"
              isText
            >
              <template #icon>
                <IconMail :size="20" stroke-width="2" />
              </template>
            </DashboardMetricCard>
          </router-link>
        </div>
      </template>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { memberService } from '@/services/member.service';
import { roleService } from '@/services/role.service';
import { apiErrorMessage } from '@/utils/error';
import { Permissions } from '@/constants/permissions';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import {
  IconUsers,
  IconShieldLock,
  IconBuildingStore,
  IconMail,
} from '@tabler/icons-vue';

const authStore = useAuthStore();
const { companyId, companyPath } = useCompanyPath();

const isLoading = ref(true);
const totalRoles = ref(0);
const totalMembers = ref(0);
const activeMembers = ref(0);
const loadError = ref<string | null>(null);

/**
 * Los conteos salen de `total` del servidor (limit: 1), no de `members.length`:
 * tras la paginación server-side esa longitud es el tamaño de la página, así
 * que "De un total de 20" mentía en cuanto la empresa tenía más de 20 miembros.
 * Se consulta el servicio en vez de `memberStore` para no pisar la página ni los
 * filtros que el usuario dejó en MembersView.
 */
const welcomeSubtitle = computed(() => {
  const name = authStore.user?.name?.trim();
  return name
    ? `Bienvenido de nuevo, ${name}. Aquí tienes el resumen de tu workspace.`
    : 'Aquí tienes el resumen de tu workspace.';
});

const loadData = async () => {
  if (!companyId.value) {
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  loadError.value = null;
  try {
    const [allMembers, activeOnly, roles] = await Promise.all([
      memberService.getMembers({ page: 1, limit: 1 }),
      memberService.getMembers({ page: 1, limit: 1, status: 'active' }),
      roleService.getRoles(),
    ]);
    totalMembers.value = allMembers.total;
    activeMembers.value = activeOnly.total;
    totalRoles.value = roles.length;
  } catch (error) {
    loadError.value = apiErrorMessage(error, 'No pudimos cargar las métricas');
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// Cambiar de empresa debe recargar los contadores.
watch(companyId, loadData);

const activeCompany = computed(() =>
  authStore.user?.tenants?.find((tenant) => tenant.id === authStore.activeTenantId)
);
const activeCompanyName = computed(() => activeCompany.value?.name || '---');
const activeCompanyRole = computed(() => {
  if (activeCompany.value?.roles?.includes('Owner')) return 'Administrador Principal';
  return 'Miembro del Equipo';
});
</script>

<style scoped>
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.metric-skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.metric-skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.metric-link {
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: var(--radius-lg);
}
.metric-link .metric-card {
  cursor: pointer;
  height: 100%;
}
</style>
