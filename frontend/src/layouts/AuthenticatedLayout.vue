<template>
  <div class="layout-container">
    <!-- Atajo de teclado: salta la navegación lateral al contenido principal -->
    <a class="skip-link" href="#contenido-principal">Saltar al contenido principal</a>

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
            <button class="org-trigger" v-bind="triggerAria" @click="toggle">
              <IconBuildingCommunity :size="16" stroke-width="1.8" />
              <span class="org-trigger-name">{{ activeOrg?.name || 'Mi Empresa' }}</span>
              <IconArrowsUpDown :size="14" stroke-width="1.8" class="org-arrows" />
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
              <span>Mi Cuenta</span>
            </button>
            <div class="dropdown-divider"></div>
            <div class="dropdown-section-label">Tema</div>
            <div class="theme-options">
              <label class="theme-option" :class="{ active: !isDarkMode }">
                <input type="radio" name="theme" value="light" :checked="!isDarkMode" @change="setTheme(false)" />
                <span>Claro</span>
              </label>
              <label class="theme-option" :class="{ active: isDarkMode }">
                <input type="radio" name="theme" value="dark" :checked="isDarkMode" @change="setTheme(true)" />
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
              <span>Cerrar Sesión</span>
            </button>
          </template>
        </UiDropdown>
      </div>
    </header>

    <div class="layout-body" :class="{ 'is-pinned-layout': isSidebarPinned }">
      <div v-if="isMobileSidebarOpen" class="mobile-backdrop" @click="closeMobileSidebar"></div>
      <!-- El sidebar usa los eventos de JS para ignorar los parpadeos del DOM -->
      <aside 
        class="sidebar" 
        :class="{
          'is-expanded': isSidebarPinned || isSidebarExpanded,
          'mobile-open': isMobileSidebarOpen,
          'is-pinned': isSidebarPinned,
        }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <button
          class="mobile-close-btn"
          aria-label="Cerrar el menú de navegación"
          @click="closeMobileSidebar"
        >
          <IconX :size="18" stroke-width="1.8" />
        </button>
        <nav class="sidebar-nav" aria-label="Navegación principal">
          <router-link :to="companyPath('/dashboard')" class="nav-link" exact-active-class="active">
            <IconLayoutDashboard :size="22" stroke-width="1.8" />
            <span class="nav-label">Panel</span>
          </router-link>
          <router-link :to="companyPath('/members')" class="nav-link" active-class="active" v-permission="Permissions.USERS.READ">
            <IconUsers :size="22" stroke-width="1.8" />
            <span class="nav-label">Equipo</span>
          </router-link>
          <router-link :to="companyPath('/branches')" class="nav-link" active-class="active" v-permission="Permissions.BRANCHES.READ">
            <IconBuildingCommunity :size="22" stroke-width="1.8" />
            <span class="nav-label">Sedes</span>
          </router-link>
          <router-link :to="companyPath('/roles')" class="nav-link" active-class="active" v-permission="Permissions.ROLES.READ">
            <IconShieldLock :size="22" stroke-width="1.8" />
            <span class="nav-label">Roles</span>
          </router-link>
          <router-link :to="companyPath('/audit')" class="nav-link" active-class="active" v-permission="Permissions.AUDIT.READ">
            <IconClipboardList :size="22" stroke-width="1.8" />
            <span class="nav-label">Auditoría</span>
          </router-link>
          <router-link :to="companyPath('/settings')" class="nav-link" active-class="active" v-permission="Permissions.COMPANY.READ">
            <IconSettings :size="22" stroke-width="1.8" />
            <span class="nav-label">Ajustes</span>
          </router-link>
        </nav>

        <div class="sidebar-bottom">
          <button class="nav-link" @click="toggleTheme">
            <IconSun v-if="!isDarkMode" :size="22" stroke-width="1.8" />
            <IconMoon v-else :size="22" stroke-width="1.8" />
            <span class="nav-label">{{ isDarkMode ? 'Claro' : 'Oscuro' }}</span>
          </button>
          <button
            class="nav-link"
            :aria-pressed="isSidebarPinned"
            :title="isSidebarPinned ? 'Dejar de fijar el menú' : 'Fijar el menú'"
            @click="toggleSidebarPinned"
          >
            <IconPin v-if="!isSidebarPinned" :size="22" stroke-width="1.8" />
            <IconPinFilled v-else :size="22" stroke-width="1.8" />
            <span class="nav-label">{{ isSidebarPinned ? 'Fijado' : 'Fijar' }}</span>
          </button>
        </div>
      </aside>

      <main id="contenido-principal" class="main-content" tabindex="-1">
        <!--
          La clave fuerza el remount en cada ruta, lo que reinicia la animación
          de entrada. Se limita a cambios de empresa/ruta de sección: en la
          paginación interna volver a animar molesta más de lo que aporta.
        -->
        <div :key="viewKey" class="view-transition">
          <slot></slot>
        </div>
      </main>
    </div>

    <UiModal v-model="isCreateModalOpen">
      <form @submit.prevent="handleCreateSubmit">
        <UiCard>
          <template #header>
            <h3 class="card-title">Nueva Organización</h3>
            <p class="card-description">Agrega un nuevo espacio de trabajo a tu cuenta.</p>
          </template>
          <div class="form-body">
            <UiAlert v-if="companyStore.error">{{ companyStore.error }}</UiAlert>
            <UiInput v-model="createForm.name" label="Nombre" required />
            <UiInput v-model="createForm.tax_id" label="Tax ID / NIT / RFC (Opcional)" />
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
  </div>
</template>

<script lang="ts">
import { ref } from 'vue';

// Al declarar esto fuera de "setup", la variable se vuelve persistente en memoria.
// Vue Router puede hacer lo que quiera, pero el sidebar "recordará" si está expandido.
const isSidebarExpanded = ref(false);
let sidebarHoverTimeout: ReturnType<typeof setTimeout> | null = null;

const SIDEBAR_PIN_KEY = 'saasapp:sidebar-pinned';

function readSidebarPinned(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) === '1';
  } catch {
    return false;
  }
}

const isSidebarPinned = ref(readSidebarPinned());

const toggleSidebarPinned = () => {
  isSidebarPinned.value = !isSidebarPinned.value;
  try {
    localStorage.setItem(SIDEBAR_PIN_KEY, isSidebarPinned.value ? '1' : '0');
  } catch {
    // Modo privado o storage bloqueado: el pin solo durará la sesión.
  }
};
</script>

<script setup lang="ts">
import { computed, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { useTheme } from '@/composables/useTheme';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { companyPathFor, tenantUrlParam, preservableSection } from '@/utils/tenant';
import { Permissions } from '@/constants/permissions';
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
  IconLayoutDashboard,
  IconUsers,
  IconShieldLock,
  IconClipboardList,
  IconSettings,
  IconUserCircle,
  IconLogout,
  IconChevronRight,
  IconCheck,
  IconPlus,
  IconPin,
  IconPinFilled,
  IconSun,
  IconMoon,
  IconSearch,
  IconBuildingCommunity,
  IconArrowsUpDown,
  IconMenu2,
  IconX,
} from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
const { isDarkMode, applyTheme, toggleTheme } = useTheme();
const { companyId, companyPath } = useCompanyPath();

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

const isMobileSidebarOpen = ref(false);

const mobileMenuBtn = ref<HTMLButtonElement | null>(null);

// Ruta "de sección": cambia la vista, pero no la paginación interna de una tabla.
const viewKey = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  // /:companyId/:seccion
  return `${companyId.value ?? ''}/${segments[1] ?? ''}`;
});

/** Al cerrar el cajón el foco no debe quedarse en un nodo que desaparece. */
const closeMobileSidebar = () => {
  isMobileSidebarOpen.value = false;
  nextTick(() => mobileMenuBtn.value?.focus());
};

const toggleMobileSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
};

// Close mobile sidebar on route change
watch(() => route.path, () => {
  isMobileSidebarOpen.value = false;
});

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});

// Controladores súper suaves para el Sidebar
const handleMouseEnter = () => {
  if (sidebarHoverTimeout) {
    clearTimeout(sidebarHoverTimeout);
    sidebarHoverTimeout = null;
  }
  // Si está fijado, el hover no debe colapsarlo al salir el puntero.
  if (isSidebarPinned.value) return;
  isSidebarExpanded.value = true;
};

const handleMouseLeave = () => {
  if (isSidebarPinned.value) return;
  // Solo se cierra si el mouse está fuera más de 150ms reales
  sidebarHoverTimeout = setTimeout(() => {
    isSidebarExpanded.value = false;
  }, 150);
};

const activeOrg = computed(() =>
  authStore.user?.tenants?.find((t: any) => t.id === authStore.activeTenantId) || null
);

const filteredTenants = computed(() => {
  if (!orgSearchQuery.value) return authStore.user?.tenants || [];
  const q = orgSearchQuery.value.toLowerCase();
  return (authStore.user?.tenants || []).filter((t: any) => t.name.toLowerCase().includes(q));
});

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Panel',
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
  const tenant = authStore.user?.tenants?.find((t) => t.id === tenantId);
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
    const tenant = authStore.user?.tenants?.find((t) => t.id === tenantId);
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
    console.error('Error al crear la empresa', error);
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-app);
}

/* Enlace de salto: oculto hasta recibir el foco por teclado */
.skip-link {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 200;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  color: var(--text-main);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform 0.15s ease-out;
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Al saltar, el <main> no debe mostrar un contorno de foco gigante */
.main-content:focus {
  outline: none;
}

/* Transición de entrada al cambiar de vista. El override global de
   prefers-reduced-motion en main.css la desactiva por completo. */
.view-transition {
  animation: view-in 0.18s ease-out;
}

@keyframes view-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

.badge-free {
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid var(--border);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.org-arrows {
  color: var(--text-light);
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
  font-family: monospace;
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
.theme-option input {
  display: none;
}

/* LAYOUT BODY */
.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* SIDEBAR - fixed position */
.sidebar {
  position: fixed;
  top: var(--topbar-height);
  left: 0;
  width: var(--sidebar-collapsed);
  height: calc(100vh - var(--topbar-height));
  height: calc(100dvh - var(--topbar-height));
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s ease;
  overflow: hidden;
  z-index: 20;
}

/* Estilos de expansión ahora controlados 100% por Vue */
.sidebar.is-expanded {
  width: var(--sidebar-width);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
}

.sidebar.is-expanded .nav-label {
  opacity: 1;
  width: auto;
  margin-left: 0;
  transition: opacity 0.18s ease 0.06s;
}

.sidebar.is-expanded .nav-link {
  justify-content: flex-start;
  padding: var(--space-2) var(--space-3);
  gap: var(--space-3);
}

.sidebar .nav-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
  margin-left: -8px;
  transition: opacity 0.1s ease, width 0s ease 0.15s, margin 0s ease 0.15s;
}

.sidebar.is-expanded .sidebar-bottom .nav-label {
  transition: opacity 0.18s ease 0.1s;
}

/* SIDEBAR NAV */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-2) 6px;
  gap: 2px;
}

.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: 10px 0;
  border-radius: var(--radius);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--text-muted);
  transition: all 0.15s;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  min-height: 30px;
}
.nav-link:hover {
  color: var(--text-main);
  background-color: var(--bg-hover);
}
.nav-link.active {
  color: var(--text-main);
  background-color: var(--bg-active);
  font-weight: 500;
}

.sidebar-bottom {
  padding: 6px;
  border-top: 1px solid var(--border);
}

/* MAIN CONTENT */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6) var(--space-8);
  background-color: var(--bg-app);
  margin-left: var(--sidebar-collapsed);
  transition: margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

/*
 * Solo el modo fijado ("Anclar") empuja el contenido: el expand por hover
 * sigue siendo un overlay encima de la vista. En móvil el cajón es
 * off-canvas, así que el empuje solo existe en desktop.
 */
@media (min-width: 769px) {
  .layout-body.is-pinned-layout .main-content {
    margin-left: var(--sidebar-width);
  }
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

.mobile-close-btn {
  display: none;
}

.mobile-backdrop {
  display: none;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }
  .sidebar .mobile-close-btn {
    display: flex;
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: var(--bg-hover);
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius);
    z-index: 5;
  }
  .sidebar {
    width: var(--sidebar-width);
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: none;
  }
  .sidebar.is-expanded {
    width: var(--sidebar-width);
  }
  .sidebar.is-expanded .nav-label {
    opacity: 1;
    width: auto;
    margin-left: 0;
  }
  .sidebar .nav-label {
    opacity: 0;
    width: 0;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0,0,0,0.5);
  }
  .sidebar.mobile-open .nav-label {
    opacity: 1;
    width: auto;
    margin-left: 0;
  }
  .sidebar.mobile-open .nav-link {
    justify-content: flex-start;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-3);
  }
  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 19;
  }
  .main-content {
    margin-left: 0;
    padding: var(--space-4);
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

@media (max-width: 480px) {
  .topbar {
    padding: 0 var(--space-3);
  }
  .main-content {
    padding: var(--space-3);
  }
}
</style>