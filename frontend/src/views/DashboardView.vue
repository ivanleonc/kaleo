<template>
  <AuthenticatedLayout>
    <div class="dashboard-content">
      <UiPageHeader
        title="Dashboard"
        :subtitle="welcomeSubtitle"
      />

      <UiErrorState v-if="error" :description="error" @retry="reload" />

      <div v-else class="metrics-grid">
        <router-link :to="companyPath('/members')" class="metric-link" v-permission="Permissions.USERS.READ">
          <UiMetricCard
            title="Miembros Activos"
            :value="activeMembers ?? 0"
            :trend-text="`De un total de ${totalMembers ?? 0}`"
            :trend-type="(activeMembers ?? 0) > 0 ? 'positive' : 'neutral'"
            color="blue"
            :loading="isLoading"
          >
            <template #icon>
              <IconUsers :size="20" stroke-width="2" />
            </template>
          </UiMetricCard>
        </router-link>

        <router-link :to="companyPath('/roles')" class="metric-link" v-permission="Permissions.ROLES.READ">
          <UiMetricCard
            title="Roles de Acceso"
            :value="totalRoles ?? 0"
            trend-text="Niveles de permisos"
            color="purple"
            :loading="isLoading"
          >
            <template #icon>
              <IconShieldLock :size="20" stroke-width="2" />
            </template>
          </UiMetricCard>
        </router-link>

        <router-link :to="companyPath('/settings')" class="metric-link" v-permission="Permissions.SETTINGS.READ">
          <UiMetricCard
            title="Empresa Actual"
            :value="activeCompanyName"
            :trend-text="activeCompanyRole"
            color="green"
            is-text
            :loading="isLoading"
          >
            <template #icon>
              <IconBuildingStore :size="20" stroke-width="2" />
            </template>
          </UiMetricCard>
        </router-link>

        <router-link :to="companyPath('/profile')" class="metric-link">
          <UiMetricCard
            title="Estado"
            :value="authStore.user?.email_verified ? 'Verificada' : 'Pendiente'"
            trend-text="Cuenta de email"
            :color="authStore.user?.email_verified ? 'green' : 'orange'"
            is-text
            :loading="isLoading"
          >
            <template #icon>
              <IconMail :size="20" stroke-width="2" />
            </template>
          </UiMetricCard>
        </router-link>
      </div>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useDashboardData } from '@/composables/useDashboardData';
import { memberService } from '@/services/member.service';
import { roleService } from '@/services/role.service';
import { Permissions } from '@/constants/permissions';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiMetricCard from '@/components/ui/UiMetricCard.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import {
  IconUsers,
  IconShieldLock,
  IconBuildingStore,
  IconMail,
} from '@tabler/icons-vue';

const authStore = useAuthStore();
const companyStore = useCompanyStore();
const { companyId, companyPath } = useCompanyPath();

/**
 * Los conteos salen de `total` del servidor (limit: 1), no de `members.length`:
 * tras la paginación server-side esa longitud es el tamaño de la página, así
 * que "De un total de 20" mentía en cuanto la empresa tenía más de 20 miembros.
 * Se consulta el servicio en vez de `memberStore` para no pisar la página ni los
 * filtros que el usuario dejó en MembersView.
 */
const { results, isLoading, error, reload } = useDashboardData(
  {
    allMembers:    () => memberService.getMembers({ page: 1, limit: 1 }),
    activeMembers: () => memberService.getMembers({ page: 1, limit: 1, status: 'active' }),
    roles:         () => roleService.getRoles(),
  },
  { watch: companyId },
);

const totalMembers  = computed(() => results.value.allMembers?.total ?? 0);
const activeMembers = computed(() => results.value.activeMembers?.total ?? 0);
const totalRoles    = computed(() => results.value.roles?.length ?? 0);

const welcomeSubtitle = computed(() => {
  const name = authStore.user?.name?.trim();
  return name
    ? `Bienvenido de nuevo, ${name}. Aquí tienes el resumen de tu workspace.`
    : 'Aquí tienes el resumen de tu workspace.';
});

const activeCompany = computed(() =>
  authStore.user?.tenants?.find((t) => t.id === authStore.activeTenantId)
  ?? companyStore.allCompanies.find((c) => c.id === authStore.activeTenantId)
);
const activeCompanyName = computed(() => activeCompany.value?.name || '---');
const activeCompanyRole = computed(() => {
  if (activeCompany.value?.roles?.includes('Owner')) return 'Administrador Principal';
  if (authStore.isSuperAdmin) return 'Super Admin';
  return 'Miembro del Equipo';
});
</script>

<style scoped>
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
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
