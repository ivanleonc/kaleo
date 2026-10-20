<template>
  <!-- El sidebar usa los eventos de JS para ignorar los parpadeos del DOM -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- los handlers de hover/foco solo expanden el sidebar para revelar las etiquetas; la interacción real vive en los enlaces internos -->
  <aside
    class="sidebar"
    :class="{
      'is-expanded': isSidebarPinned || isSidebarExpanded,
      'mobile-open': isMobileSidebarOpen,
      'is-pinned': isSidebarPinned,
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="handleMouseEnter"
    @focusout="handleSidebarFocusOut"
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
      <router-link :to="companyPath('/energy')" class="nav-link" active-class="active" v-permission="Permissions.DASHBOARD.READ">
        <IconBolt :size="22" stroke-width="1.8" />
        <span class="nav-label">Energía</span>
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
      <!-- Enlace a la documentación — se abre en pestaña nueva -->
      <a
        href="https://kaleo-docs.pages.dev"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-link docs-link"
        :title="'Documentación'"
      >
        <IconBook :size="22" stroke-width="1.8" />
        <span class="nav-label">Documentación</span>
      </a>
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
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useSidebar } from '@/composables/useSidebar';
import { Permissions } from '@/constants/permissions';
import {
  IconLayoutDashboard,
  IconBolt,
  IconUsers,
  IconShieldLock,
  IconClipboardList,
  IconSettings,
  IconPin,
  IconPinFilled,
  IconSun,
  IconMoon,
  IconX,
  IconBook,
  IconBuildingCommunity,
} from '@tabler/icons-vue';

const { companyPath } = useCompanyPath();
const { isDarkMode, toggleTheme } = useTheme();
const {
  isSidebarExpanded,
  isSidebarPinned,
  isMobileSidebarOpen,
  toggleSidebarPinned,
  closeMobileSidebar,
  handleMouseEnter,
  handleMouseLeave,
  handleSidebarFocusOut,
} = useSidebar();
</script>

<style scoped>
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

/* El link de docs es un <a> que usa la misma clase nav-link
   pero necesita reset de text-decoration heredada del browser */
.sidebar-bottom .docs-link {
  text-decoration: none;
}
.sidebar-bottom .docs-link:hover {
  color: var(--primary);
  background-color: var(--primary-active);
}

.mobile-close-btn {
  display: none;
}

/* RESPONSIVE */
@media (max-width: 768px) {
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
}
</style>
