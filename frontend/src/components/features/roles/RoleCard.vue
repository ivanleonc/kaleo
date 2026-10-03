<template>
  <!--
    RoleCard — Tarjeta de un rol con sus permisos agrupados por módulo.

    Maneja internamente el estado de expansión de módulos (UI local, no global).
    Los eventos de editar/eliminar se emiten hacia la view para que abra los modales.

    Props:
      - role: el objeto Role completo
    Emits:
      - edit: cuando el usuario elige "Editar Rol"
      - delete: cuando el usuario elige "Eliminar Rol"
  -->
  <UiCard class="role-card">
    <!-- Cabecera: ícono + nombre + badge tipo + menú de acciones -->
    <div class="role-card-header">
      <div class="role-title-row">
        <div
          class="role-icon"
          :class="role.is_system ? 'system' : 'custom'"
          :style="role.color ? { background: `${role.color}1A`, color: role.color } : undefined"
        >
          <IconShield v-if="role.is_system" :size="20" />
          <IconUserCog v-else :size="20" />
        </div>
        <div class="role-title-text">
          <h3 class="role-name">{{ role.name }}</h3>
          <UiBadge size="sm" :variant="role.is_system ? 'info' : 'neutral'">
            {{ role.is_system ? 'Sistema' : 'Personalizado' }}
          </UiBadge>
        </div>
      </div>

      <!-- Acciones (solo roles no-sistema) -->
      <div class="role-actions" v-if="!role.is_system">
        <UiDropdown align="end" label="Acciones del rol">
          <template #trigger="{ toggle, triggerAria }">
            <button
              class="role-menu-btn"
              @click.stop="toggle"
              v-bind="triggerAria"
              :aria-label="`Acciones para ${role.name}`"
            >
              <IconDotsVertical :size="16" />
            </button>
          </template>
          <template #default>
            <UiDropdownItem @click="emit('edit', role)" v-permission="Permissions.ROLES.UPDATE">
              <IconPencil :size="14" />
              <span>Editar Rol</span>
            </UiDropdownItem>
            <div class="ui-dropdown-divider" role="separator"></div>
            <UiDropdownItem danger @click="emit('delete', role)" v-permission="Permissions.ROLES.DELETE">
              <IconTrash :size="14" />
              <span>Eliminar Rol</span>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
    </div>

    <!-- Descripción -->
    <p class="role-description">{{ role.description || getRoleDescription(role.name) }}</p>

    <!-- Permisos agrupados por módulo -->
    <div class="role-card-body">
      <div v-if="role.permissions.length === 0" class="role-empty">
        <IconLock :size="24" />
        <span>Sin permisos asignados</span>
      </div>

      <template v-else>
        <div
          v-for="(perms, module) in groupedPermissions"
          :key="module"
          class="module-group"
        >
          <button class="module-header" @click="toggleModule(String(module))">
            <div class="module-info">
              <span
                class="module-dot"
                :style="{ '--module-color': `var(--module-${module}, var(--text-muted))` }"
              />
              <span class="module-name">{{ getModuleName(String(module)) }}</span>
            </div>
            <div class="module-right">
              <span class="module-count">{{ perms.length }}</span>
              <IconChevronDown
                :size="14"
                class="module-chevron"
                :class="{ rotated: !isModuleExpanded(String(module)) }"
              />
            </div>
          </button>
          <div v-show="isModuleExpanded(String(module))" class="module-perms">
            <div v-for="perm in perms" :key="perm.id" class="perm-item">
              <span class="perm-name">{{ perm.name }}</span>
              <span class="perm-code">{{ perm.code }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Footer: conteo de permisos -->
    <div class="role-card-footer">
      <span class="perm-total">
        <IconKey :size="14" />
        {{ role.permissions.length }} permisos
      </span>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { Role, Permission } from '@/types/role';
import {
  IconShield,
  IconUserCog,
  IconLock,
  IconChevronDown,
  IconKey,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from '@tabler/icons-vue';

const props = defineProps<{
  role: Role;
}>();

const emit = defineEmits<{
  edit: [role: Role];
  delete: [role: Role];
}>();

// --- Expansión de módulos (estado UI local) ---
// Por defecto todos los módulos están expandidos.
const collapsedModules = ref(new Set<string>());

function toggleModule(module: string) {
  if (collapsedModules.value.has(module)) collapsedModules.value.delete(module);
  else collapsedModules.value.add(module);
}

function isModuleExpanded(module: string): boolean {
  return !collapsedModules.value.has(module);
}

// --- Agrupación de permisos por módulo ---
const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {};
  for (const p of props.role.permissions) {
    if (!groups[p.module]) groups[p.module] = [];
    groups[p.module]!.push(p);
  }
  return groups;
});

// --- Labels ---
const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticación',
  users: 'Usuarios',
  roles: 'Roles',
  company: 'Empresa',
  settings: 'Configuración',
  profile: 'Perfil',
  dashboard: 'Dashboard',
  branches: 'Sedes',
  audit: 'Auditoria',
  billing: 'Facturación',
  notifications: 'Notificaciones',
  integrations: 'Integraciones',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner: 'Control total del sistema. Gestión de usuarios, roles, facturación y configuración.',
  Admin: 'Acceso extendido excepto eliminación de usuarios y gestión de roles.',
  Viewer: 'Solo lectura. Puede consultar pero no modificar datos.',
};

function getModuleName(code: string): string {
  return MODULE_LABELS[code] ?? code;
}

function getRoleDescription(name: string): string {
  return ROLE_DESCRIPTIONS[name] ?? 'Rol personalizado de la organización.';
}
</script>

<style scoped>
.role-card { padding: 0 !important; overflow: hidden; }

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border);
}

.role-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.role-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.role-icon.system {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}
.role-icon.custom {
  background: var(--bg-hover);
  color: var(--text-muted);
}

.role-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.role-title-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.role-actions { flex-shrink: 0; }

.role-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.15s;
}
.role-menu-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.role-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
  padding: 0 var(--space-5) var(--space-4);
  line-height: 1.5;
}

.role-card-body {
  padding: var(--space-2) 0;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.role-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.module-group { border-bottom: 1px solid var(--border); }
.module-group:last-child { border-bottom: none; }

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
}
.module-header:hover { background: var(--bg-hover); }

.module-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.module-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--module-color, var(--text-muted));
}

.module-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.module-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.module-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-app);
  border: 1px solid var(--border);
  padding: 0 6px;
  border-radius: 10px;
  line-height: 1.6;
}

.module-chevron {
  color: var(--text-muted);
  transition: transform 0.2s;
}
.module-chevron.rotated { transform: rotate(-90deg); }

.module-perms { padding: 0 var(--space-4) var(--space-2); }

.perm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  padding-left: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.perm-item:last-child { border-bottom: none; }

.perm-name {
  font-size: var(--text-sm);
  color: var(--text-main);
}

.perm-code {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted);
  background: var(--bg-app);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.role-card-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border);
  background: var(--bg-app);
}

.perm-total {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
