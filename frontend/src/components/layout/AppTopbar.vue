<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        ref="mobileMenuBtn"
        class="mobile-menu-btn"
        aria-label="Abrir el menú de navegación"
        :aria-expanded="isMobileSidebarOpen"
        @click="toggleMobileSidebar"
      >
        <IconMenu2 :size="20" stroke-width="1.8" />
      </button>
      <router-link :to="companyPath('/dashboard')" class="topbar-logo">
        <IconBolt :size="22" stroke-width="2.5" />
      </router-link>
      <IconChevronRight :size="14" class="topbar-sep" />

      <!-- Sin class aquí: UiDropdown tiene dos raíces (trigger + Teleport) y Vue
           descarta los atributos no-props con un warning en consola. -->
      <UiDropdown
        align="start"
        label="Cambiar de organización"
      >
        <template #trigger="{ toggle, triggerAria }">
          <button class="org-trigger" v-bind="triggerAria" :aria-busy="isSwitchingOrg" @click="toggle">
            <IconBuildingCommunity :size="16" stroke-width="1.8" />
            <span class="org-trigger-name">{{ activeOrg?.name || 'Mi Empresa' }}</span>
            <span v-if="isSwitchingOrg" class="org-spinner" aria-hidden="true"></span>
            <IconArrowsUpDown v-else :size="14" stroke-width="1.8" class="org-arrows" />
          </button>
        </template>

        <template #default="{ close }">
          <div class="org-dropdown-search">
            <IconSearch :size="14" />
            <input
              type="search"
              placeholder="Buscar organización..."
              aria-label="Buscar organización"
              v-model="orgSearchQuery"
            />
          </div>
          <div class="dropdown-divider"></div>
          <button
            v-for="tenant in filteredTenants"
            :key="tenant.id"
            type="button"
            class="dropdown-item"
            :class="{
              active: authStore.activeTenantId === tenant.id,
              disabled: isSwitchingOrg,
            }"
            role="menuitem"
            :disabled="isSwitchingOrg"
            @click="handleOrgChange(tenant.id); close()"
          >
            <span>{{ tenant.name }}</span>
            <IconCheck
              v-if="authStore.activeTenantId === tenant.id"
              class="check-icon"
              :size="14"
            />
          </button>
          <div class="dropdown-divider"></div>
          <template v-if="authStore.isSuperAdmin && filteredAllCompanies.length > 0">
            <p class="dropdown-section-label">Todas las empresas</p>
            <button
              v-for="company in filteredAllCompanies"
              :key="`all-${company.id}`"
              type="button"
              class="dropdown-item"
              :class="{
                active: authStore.activeTenantId === company.id,
                disabled: isSwitchingOrg,
              }"
              role="menuitem"
              :disabled="isSwitchingOrg"
              @click="handleOrgChange(company.id); close()"
            >
              <span>{{ company.name }}</span>
              <IconCheck
                v-if="authStore.activeTenantId === company.id"
                class="check-icon"
                :size="14"
              />
            </button>
            <div class="dropdown-divider"></div>
          </template>
          <button
            type="button"
            class="dropdown-item create-action"
            role="menuitem"
            @click="openCreateModal(); close()"
          >
            <IconPlus :size="14" />
            <span>Nueva organización</span>
          </button>
        </template>
      </UiDropdown>

      <!-- Breadcrumbs -->
      <nav class="topbar-breadcrumb" v-if="breadcrumbs.length > 0">
        <IconChevronRight :size="12" class="breadcrumb-sep" />
        <ol>
          <li v-for="(item, index) in breadcrumbs" :key="index">
            <router-link v-if="!item.isLast" :to="item.url" class="breadcrumb-link">{{ item.name }}</router-link>
            <span v-else class="breadcrumb-current">{{ item.name }}</span>
            <IconChevronRight v-if="!item.isLast" class="breadcrumb-sep" :size="10" />
          </li>
        </ol>
      </nav>
    </div>

    <div class="topbar-right">
      <button type="button" class="search-box search-box-button" @click="isPaletteOpen = true" aria-label="Búsqueda rápida">
        <IconSearch :size="14" />
        <span class="search-placeholder">Buscar...</span>
        <span class="search-shortcut">Ctrl K</span>
      </button>

      <UiDropdown align="end" label="Menú de usuario" :min-width="240">
        <template #trigger="{ toggle, triggerAria }">
          <button class="user-trigger" v-bind="triggerAria" @click="toggle" aria-label="Abrir menú de usuario">
            <UiAvatar
              :src="authStore.user?.avatar_url"
              :name="authStore.user?.name || authStore.user?.email"
              size="sm"
              loading="eager"
            />
          </button>
        </template>

        <template #default="{ close }">
          <div class="user-dropdown-header">
            <span class="user-dropdown-name">{{ authStore.user?.name || 'Usuario' }}</span>
            <span class="user-dropdown-email">{{ authStore.user?.email }}</span>
          </div>
          <div class="dropdown-divider"></div>
          <button
            type="button"
            class="dropdown-item"
            role="menuitem"
            @click="router.push(companyPath('/profile')); close()"
          >
            <IconUserCircle :size="16" />
            <span>Mi cuenta</span>
          </button>
          <a
            href="https://kaleo-docs.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            class="dropdown-item"
            role="menuitem"
          >
            <IconBook :size="16" />
            <span>Documentación</span>
          </a>
          <div class="dropdown-divider"></div>
          <div class="dropdown-section-label">Tema</div>
          <div class="theme-options" role="radiogroup" aria-label="Tema">
            <label class="theme-option" :class="{ active: !isDarkMode }">
              <input class="sr-only" type="radio" name="theme" value="light" :checked="!isDarkMode" @change="setTheme(false)" />
              <span>Claro</span>
            </label>
            <label class="theme-option" :class="{ active: isDarkMode }">
              <input class="sr-only" type="radio" name="theme" value="dark" :checked="isDarkMode" @change="setTheme(true)" />
              <span>Oscuro</span>
            </label>
          </div>
          <div class="dropdown-divider"></div>
          <button
            type="button"
            class="dropdown-item danger"
            role="menuitem"
            @click="handleLogout(); close()"
          >
            <IconLogout :size="16" />
            <span>Cerrar sesión</span>
          </button>
        </template>
      </UiDropdown>
    </div>
  </header>

  <UiModal v-model="isCreateModalOpen" label="Nueva organización">
    <form @submit.prevent="handleCreateSubmit">
      <UiCard>
        <template #header>
          <h3 class="card-title">Nueva organización</h3>
          <p class="card-description">Agrega un nuevo espacio de trabajo a tu cuenta.</p>
        </template>
        <div class="form-body">
          <UiAlert v-if="companyStore.error">{{ companyStore.error }}</UiAlert>
          <UiInput v-model="createForm.name" label="Nombre" required />
          <UiInput v-model="createForm.tax_id" label="Tax ID / NIT / RFC (opcional)" />
        </div>
        <template #footer>
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="isCreateModalOpen = false">Cancelar</UiButton>
            <UiButton type="submit" :loading="companyStore.isLoading">Crear</UiButton>
          </div>
        </template>
      </UiCard>
    </form>
  </UiModal>

  <CommandPalette v-model="isPaletteOpen" />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useTheme } from '@/composables/useTheme';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useSidebar } from '@/composables/useSidebar';
import { companyPathFor, tenantUrlParam, preservableSection } from '@/utils/tenant';
import UiModal from '@/components/ui/UiModal.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import CommandPalette from '@/components/CommandPalette.vue';
import {
  IconBolt,
  IconUserCircle,
  IconLogout,
  IconChevronRight,
  IconCheck,
  IconPlus,
  IconSearch,
  IconBuildingCommunity,
  IconArrowsUpDown,
  IconMenu2,
  IconBook,
} from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
const { isDarkMode, applyTheme } = useTheme();
const { companyPath } = useCompanyPath();
const { isMobileSidebarOpen, toggleMobileSidebar, registerMobileMenuButton } = useSidebar();

const mobileMenuBtn = ref<HTMLButtonElement | null>(null);
watch(mobileMenuBtn, (el) => registerMobileMenuButton(el));

const isCreateModalOpen = ref(false);
const isPaletteOpen = ref(false);
const orgSearchQuery = ref('');
const createForm = reactive({ name: '', tax_id: '' });

const onGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    isPaletteOpen.value = !isPaletteOpen.value;
  }
};

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
  // Super-admin: precargar todas las empresas para la sección "Todas"
  // del switcher y la resolución de rutas a compañías ajenas.
  if (authStore.isSuperAdmin) {
    companyStore.fetchAllCompanies().catch(() => {});
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});

const activeOrg = computed(
  () =>
    authStore.user?.tenants?.find((t: any) => t.id === authStore.activeTenantId) ??
    companyStore.allCompanies.find((c) => c.id === authStore.activeTenantId) ??
    null,
);

const filteredTenants = computed(() => {
  if (!orgSearchQuery.value) return authStore.user?.tenants || [];
  const q = orgSearchQuery.value.toLowerCase();
  return (authStore.user?.tenants || []).filter((t: any) => t.name.toLowerCase().includes(q));
});

/**
 * Todas las empresas (solo super-admin), excluyendo las propias para no
 * duplicarlas. Se carga una vez al montar el layout.
 */
const filteredAllCompanies = computed(() => {
  if (!authStore.isSuperAdmin) return [];
  const mine = new Set((authStore.user?.tenants ?? []).map((t: any) => t.id));
  const all = companyStore.allCompanies.filter((c) => !mine.has(c.id));
  if (!orgSearchQuery.value) return all;
  const q = orgSearchQuery.value.toLowerCase();
  return all.filter((c) => c.name.toLowerCase().includes(q));
});

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Panel',
  analyses: 'Analítica',
  members: 'Equipo',
  branches: 'Sedes',
  roles: 'Roles',
  audit: 'Auditoría',
  settings: 'Empresa',
  profile: 'Mi Cuenta',
  'change-password': 'Cambiar Contraseña',
};

const breadcrumbs = computed(() => {
  const match = route.path.match(/\/companies\/[^/]+\/(.+)/);
  if (!match?.[1]) return [];

  const segments = match[1].split('/').filter(Boolean);
  const companyIdParam = route.params.companyId as string;
  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const isUuid = /^[0-9a-f]{8}-/i.test(segment);
    const name = SECTION_LABELS[segment]
      || (isUuid ? 'Detalle' : segment.charAt(0).toUpperCase() + segment.slice(1));
    const url = `/companies/${companyIdParam}/${segments.slice(0, index + 1).join('/')}`;
    return { name, url, isLast };
  });
});

const setTheme = (dark: boolean) => {
  applyTheme(dark);
};

const isSwitchingOrg = ref(false);

/** Ruta canónica (slug cuando existe) al panel de una empresa. */
const dashboardPathFor = (tenantId: string): string => {
  const tenant =
    authStore.user?.tenants?.find((t) => t.id === tenantId) ??
    companyStore.allCompanies.find((c) => c.id === tenantId);
  return companyPathFor(tenant, '/dashboard') || `/companies/${tenantId}/dashboard`;
};

const handleOrgChange = async (tenantId: string) => {
  if (isSwitchingOrg.value) return;
  if (tenantId === authStore.activeTenantId) return;
  isSwitchingOrg.value = true;
  try {
    authStore.setActiveTenant(tenantId);
    orgSearchQuery.value = '';
    // Refrescar claims (roles/permisos son por empresa y viven en el JWT)
    await authStore.refreshTokens();
    await authStore.fetchProfile();
    const tenant =
      authStore.user?.tenants?.find((t) => t.id === tenantId) ??
      companyStore.allCompanies.find((c) => c.id === tenantId);
    // Quedarse en la sección actual: el guard de rutas (con los claims ya
    // frescos) solo redirige al Panel si la nueva empresa no tiene permiso.
    const section = preservableSection(route.path, route.name);
    const target =
      section === '/dashboard'
        ? dashboardPathFor(tenantId)
        : companyPathFor(tenant, section) || dashboardPathFor(tenantId);
    await router.push({ path: target, query: route.query, hash: route.hash }).catch(() => {});
    // Reconciliar: si la navegación fue abortada/superada, la URL manda al recargar
    const expectedParam = tenantUrlParam(tenant) ?? tenantId;
    const landed = router.currentRoute.value.params.companyId;
    if (landed !== expectedParam) {
      await router.push({ path: target, query: route.query, hash: route.hash }).catch(() => {});
    }
  } finally {
    isSwitchingOrg.value = false;
  }
};

const openCreateModal = () => {
  createForm.name = '';
  createForm.tax_id = '';
  companyStore.error = null;
  isCreateModalOpen.value = true;
};

const handleCreateSubmit = async () => {
  try {
    await companyStore.createCompany({ name: createForm.name, tax_id: createForm.tax_id });
    isCreateModalOpen.value = false;
    // Los tokens previos no traen la nueva empresa en sus claims
    await authStore.refreshTokens();
    await authStore.fetchProfile();
    const newTenantId = authStore.activeTenantId;
    if (newTenantId) {
      router.push(dashboardPathFor(newTenantId));
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error al crear la empresa', error);
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
/* TOPBAR */
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background-color: var(--bg-navbar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 30;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.topbar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--primary);
  text-decoration: none;
  transition: opacity 0.15s;
}
.topbar-logo:hover { opacity: 0.8; }

.topbar-sep {
  color: var(--text-light);
}

/* BREADCRUMBS */
.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.topbar-breadcrumb ol {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--space-1);
}
.topbar-breadcrumb li {
  display: flex;
  align-items: center;
}
.breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-xs);
  transition: color 0.15s;
}
.breadcrumb-link:hover {
  color: var(--text-main);
}
.breadcrumb-current {
  color: var(--text-main);
  font-weight: 500;
  font-size: var(--text-xs);
}
.breadcrumb-sep {
  color: var(--text-light);
  flex-shrink: 0;
}

/* ORG DROPDOWN */
/* El panel en sí lo posiciona y estiliza UiDropdown (.ui-dropdown-menu);
   aquí solo se ajusta el disparador y el buscador que va dentro. */
.org-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color 0.15s;
  border: none;
  background: none;
  color: var(--text-main);
  height: 32px;
}
.org-trigger:hover {
  background-color: var(--bg-hover);
}

.org-trigger-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.org-arrows {
  color: var(--text-light);
}

/* Spinner del cambio de empresa: la navegación + refresh de claims puede
   tardar en conexiones lentas; sin esto la UI parece congelada. */
.org-spinner {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 2px solid var(--border);
  border-top-color: var(--text-main);
  border-radius: 50%;
  animation: org-spin 0.8s linear infinite;
}

@keyframes org-spin {
  to { transform: rotate(360deg); }
}

/* ORG DROPDOWN */
/* El panel en sí lo posiciona y estiliza UiDropdown (.ui-dropdown-menu);
   aquí solo se ajusta el buscador que va dentro. */
.org-dropdown-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius);
  color: var(--text-light);
  background-color: var(--bg-input);
  border: 1px solid var(--border);
  margin: 0 var(--space-1);
}
.org-dropdown-search:focus-within {
  border-color: var(--text-light);
  background-color: var(--bg-elevated);
}
.org-dropdown-search input {
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-sm);
  color: var(--text-main);
  width: 100%;
}
.org-dropdown-search input::placeholder { color: var(--text-placeholder); }

/* SEARCH BOX */
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background-color: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-light);
  transition: all 0.15s;
  height: 32px;
}
.search-box:focus-within {
  border-color: var(--text-light);
  background-color: var(--bg-elevated);
}
.search-box input {
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-sm);
  color: var(--text-main);
  width: 140px;
}
.search-box input::placeholder { color: var(--text-placeholder); }

button.search-box {
  cursor: pointer;
  font-family: inherit;
}
button.search-box:hover {
  border-color: var(--text-light);
  background-color: var(--bg-elevated);
}
.search-placeholder {
  font-size: var(--text-sm);
  color: var(--text-placeholder);
  width: 140px;
  text-align: left;
}
.search-shortcut {
  font-size: 0.625rem;
  color: var(--text-light);
  border: 1px solid var(--border);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--font-mono);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* DROPDOWN ITEMS */
.dropdown-divider {
  height: 1px;
  background-color: var(--border);
  margin: var(--space-1) 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  /* Reset de button: el switcher de organizaciones usa <button> y sin esto
     se ven los estilos nativos grises del navegador. Inofensivo en los <div>. */
  width: 100%;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  flex-shrink: 0;
}
.dropdown-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}
.dropdown-item.active {
  color: var(--text-main);
  background-color: var(--bg-hover);
}
.dropdown-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}
.dropdown-item.danger {
  color: var(--color-danger);
}
.dropdown-item.danger:hover {
  background-color: var(--color-danger-bg);
}
.dropdown-item.create-action {
  color: var(--primary);
}
.dropdown-item.create-action:hover {
  background-color: var(--primary-active);
}

.check-icon {
  margin-left: auto;
  color: var(--primary);
}

.dropdown-section-label {
  font-size: var(--text-xs);
  color: var(--text-light);
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

p.dropdown-section-label {
  margin: 0;
}

/* USER MENU */
.user-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.user-dropdown-header {
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-dropdown-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-main);
}

.user-dropdown-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* THEME OPTIONS */
.theme-options {
  display: flex;
  gap: var(--space-1);
  padding: 0 var(--space-3) var(--space-2);
}

.theme-option {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius);
  font-size: var(--text-xs);
  color: var(--text-muted);
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all 0.15s;
}
.theme-option:hover {
  border-color: var(--text-light);
}
.theme-option.active {
  background-color: var(--primary-active);
  border-color: var(--primary);
  color: var(--text-main);
}
.theme-option:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

/* MOBILE BUTTONS */
.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--text-main);
  cursor: pointer;
  border-radius: var(--radius);
  transition: background-color 0.15s;
}
.mobile-menu-btn:hover {
  background-color: var(--bg-hover);
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }
  .search-box {
    padding: var(--space-1) var(--space-2);
  }
  .search-box .search-placeholder,
  .search-box .search-shortcut {
    display: none;
  }
  .topbar-breadcrumb {
    display: none;
  }
}

@media (max-width: 640px) {
  .topbar {
    padding: 0 var(--space-3);
  }
}
</style>
