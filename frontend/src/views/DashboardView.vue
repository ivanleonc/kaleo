<template>
  <AuthenticatedLayout>
    <div class="dashboard-content">
      <UiPageHeader
        title="Dashboard"
        :subtitle="`Bienvenido de nuevo, ${authStore.user?.name}. Aquí tienes el resumen de tu workspace.`"
      />
      
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>Cargando métricas...</span>
      </div>

      <UiEmptyState
        v-else-if="loadError"
        title="No pudimos cargar las métricas"
        description="Revisa tu conexión e inténtalo de nuevo."
      >
        <template #action>
          <UiButton width="auto" variant="outline" @click="loadData">Reintentar</UiButton>
        </template>
      </UiEmptyState>

      <template v-else>
        <div class="metrics-grid">
          <router-link :to="companyPath('/members')" class="metric-link" v-permission="Permissions.USERS.READ">
            <DashboardMetricCard
              title="Miembros Activos"
              :value="activeMembers"
              :trendText="`De un total de ${totalMembers}`"
              trendType="positive"
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

        <div class="quick-actions">
          <h3 class="section-title">Accesos Rápidos</h3>
          <div class="actions-grid">
            <router-link :to="companyPath('/members')" class="action-card" v-permission="Permissions.USERS.READ">
              <IconUsers :size="18" />
              <span>Gestionar Miembros</span>
            </router-link>
            <router-link :to="companyPath('/branches')" class="action-card" v-permission="Permissions.BRANCHES.READ">
              <IconBuildingCommunity :size="18" />
              <span>Gestionar Sedes</span>
            </router-link>
            <router-link :to="companyPath('/roles')" class="action-card" v-permission="Permissions.ROLES.READ">
              <IconShieldLock :size="18" />
              <span>Configurar Roles</span>
            </router-link>
            <router-link :to="companyPath('/settings')" class="action-card" v-permission="Permissions.SETTINGS.READ">
              <IconSettings :size="18" />
              <span>Ajustes Empresa</span>
            </router-link>
            <router-link :to="companyPath('/profile')" class="action-card" v-permission="Permissions.PROFILE.READ">
              <IconUserCircle :size="18" />
              <span>Mi Perfil</span>
            </router-link>
          </div>
        </div>
      </template>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useMemberStore } from '@/stores/member.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { roleService } from '@/services/role.service';
import { Permissions } from '@/constants/permissions';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import {
  IconUsers,
  IconShieldLock,
  IconBuildingStore,
  IconBuildingCommunity,
  IconMail,
  IconSettings,
  IconUserCircle,
} from '@tabler/icons-vue';

const authStore = useAuthStore();
const memberStore = useMemberStore();
const { companyPath } = useCompanyPath();

const isLoading = ref(true);
const totalRoles = ref(0);
const loadError = ref(false);
let lastLoadAt = 0;

const loadData = async () => {
  if (!authStore.activeTenantId) return;
  const now = Date.now();
  if (now - lastLoadAt < 3000) return;
  lastLoadAt = now;
  isLoading.value = true;
  loadError.value = false;
  try {
    await Promise.all([
      memberStore.fetchMembers(),
      roleService.getRoles().then(r => totalRoles.value = r.length)
    ]);
  } catch (error) {
    console.error('Error cargando métricas del dashboard', error);
    loadError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const totalMembers = computed(() => memberStore.members.length);
const activeMembers = computed(() => memberStore.members.filter(m => (m.status || 'active') === 'active').length);

const activeCompany = computed(() =>
  authStore.user?.tenants?.find((t: any) => t.id === authStore.activeTenantId)
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

.loading-state {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-base);
  padding: var(--space-10) 0;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--text-main);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

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

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all 0.15s;
}
.action-card:hover {
  border-color: var(--text-light);
  color: var(--text-main);
  background-color: var(--bg-hover);
}
</style>
