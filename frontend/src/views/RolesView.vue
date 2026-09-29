<template>
  <AuthenticatedLayout>
    <div class="roles-container">
      <UiPageHeader
        title="Roles y Permisos"
        subtitle="Consulta y crea niveles de acceso para tu organización."
      >
        <template #actions>
          <UiButton v-permission="Permissions.ROLES.CREATE" @click="openCreateModal" width="auto">
            Crear Nuevo Rol
          </UiButton>
        </template>
      </UiPageHeader>

      <div v-if="isLoading" class="skeleton-grid" aria-label="Cargando roles">
        <div v-for="n in 3" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-card-title"></div>
          <div class="skeleton skeleton-card-line"></div>
          <div class="skeleton skeleton-card-line short"></div>
        </div>
      </div>

      <UiEmptyState
        v-else-if="roles.length === 0"
        title="No hay roles todavía"
        description="Crea tu primer rol personalizado para organizar los accesos."
      >
        <template #icon>
          <IconShield :size="48" stroke-width="1.5" />
        </template>
        <template #action>
          <UiButton v-permission="Permissions.ROLES.CREATE" width="auto" @click="openCreateModal">
            Crear Nuevo Rol
          </UiButton>
        </template>
      </UiEmptyState>

      <div v-else class="roles-grid">
        <UiCard v-for="role in roles" :key="role.id" class="role-card">
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
                <span class="role-badge" :class="role.is_system ? 'system' : 'custom'">
                  {{ role.is_system ? 'Sistema' : 'Personalizado' }}
                </span>
              </div>
            </div>
            <div class="role-actions" v-if="!role.is_system">
              <UiDropdown align="end" label="Acciones del rol">
                <template #trigger="{ toggle }">
                  <button class="role-menu-btn" @click.stop="toggle" aria-haspopup="menu" :aria-label="`Acciones para ${role.name}`">
                    <IconDotsVertical :size="16" />
                  </button>
                </template>
                <template #default>
                  <UiDropdownItem @click="openEditModal(role)" v-permission="Permissions.ROLES.UPDATE">
                    <IconPencil :size="14" />
                    <span>Editar Rol</span>
                  </UiDropdownItem>
                  <div class="ui-dropdown-divider" role="separator"></div>
                  <UiDropdownItem danger @click="openDeleteModal(role)" v-permission="Permissions.ROLES.DELETE">
                    <IconTrash :size="14" />
                    <span>Eliminar Rol</span>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </div>

            <p class="role-description">{{ role.description || getRoleDescription(role.name) }}</p>

          <div class="role-card-body">
            <div v-if="role.permissions.length === 0" class="role-empty">
              <IconLock :size="24" />
              <span>Sin permisos asignados</span>
            </div>

            <template v-else>
              <div
                v-for="(perms, module) in groupPermissionsByModule(role.permissions)"
                :key="module"
                class="module-group"
              >
                <button class="module-header" @click="toggleModule(role.id, String(module))">
                  <div class="module-info">
                    <span class="module-dot" :class="`dot-${module}`" />
                    <span class="module-name">{{ getModuleName(String(module)) }}</span>
                  </div>
                  <div class="module-right">
                    <span class="module-count">{{ perms.length }}</span>
                    <IconChevronDown
                      :size="14"
                      class="module-chevron"
                      :class="{ rotated: !isModuleExpanded(role.id, String(module)) }"
                    />
                  </div>
                </button>
                <div
                  v-show="isModuleExpanded(role.id, String(module))"
                  class="module-perms"
                >
                  <div v-for="perm in perms" :key="perm.id" class="perm-item">
                    <span class="perm-name">{{ perm.name }}</span>
                    <span class="perm-code">{{ perm.code }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="role-card-footer">
            <span class="perm-total">
              <IconKey :size="14" />
              {{ role.permissions.length }} permisos
            </span>
          </div>
        </UiCard>
      </div>
    </div>

    <UiModal v-model="isModalOpen" size="large" :confirm-on-dirty="true" :dirty="isCreateDirty">
      <form @submit.prevent="handleCreateSubmit">
        <UiCard>
          <template #header>
            <h3 class="card-title">Crear Rol Personalizado</h3>
          </template>
          
          <div class="form-body">
            <UiAlert v-if="errorMsg">{{ errorMsg }}</UiAlert>
            <UiInput v-model="form.name" label="Nombre del Rol" placeholder="Ej: Gestor de Finanzas" required />
            <UiInput v-model="form.description" label="Descripción (Opcional)" placeholder="¿Qué hace este rol?" />
            <UiInput v-model="form.color" label="Color (Opcional)" placeholder="#8b5cf6" />
            
            <UiDualListbox
              v-model="form.permissionIds"
              :available="allPermissionItems"
              :selected="allPermissionItems"
              label="Permisos"
              available-label="Disponibles"
              selected-label="Asignados al Rol"
            />
          </div>

          <template #footer>
            <div class="modal-footer">
              <UiButton type="button" variant="outline" @click="isModalOpen = false">Cancelar</UiButton>
              <UiButton type="submit" :loading="isSaving">Guardar Rol</UiButton>
            </div>
          </template>
        </UiCard>
      </form>
    </UiModal>

  </AuthenticatedLayout>

  <!-- Edit Modal -->
  <UiModal v-model="isEditModalOpen" size="large" :confirm-on-dirty="true" :dirty="isEditDirty">
    <form @submit.prevent="handleEditSubmit">
      <UiCard>
        <template #header>
          <h3 class="card-title">Editar Rol</h3>
        </template>
        <div class="form-body">
          <UiAlert v-if="errorMsg">{{ errorMsg }}</UiAlert>
          <UiInput v-model="editForm.name" label="Nombre del Rol" required />
          <UiInput v-model="editForm.description" label="Descripción (Opcional)" placeholder="¿Qué hace este rol?" />
          <UiInput v-model="editForm.color" label="Color (Opcional)" placeholder="#8b5cf6" />
          <UiDualListbox
            v-model="editForm.permissionIds"
            :available="allPermissionItems"
            :selected="allPermissionItems"
            label="Permisos"
            available-label="Disponibles"
            selected-label="Asignados al Rol"
          />
        </div>
        <template #footer>
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="isEditModalOpen = false">Cancelar</UiButton>
            <UiButton type="submit" :loading="isSaving">Guardar Cambios</UiButton>
          </div>
        </template>
      </UiCard>
    </form>
  </UiModal>

  <!-- Delete Confirmation Modal -->
  <UiModal v-model="isDeleteModalOpen">
    <UiCard>
      <template #header>
        <h3 class="card-title">Eliminar Rol</h3>
        <p class="card-description">
          ¿Estás seguro de eliminar el rol <strong>{{ deleteTarget?.name }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <UiAlert v-if="errorMsg">{{ errorMsg }}</UiAlert>
      </template>
      <template #footer>
        <div class="modal-footer">
          <UiButton variant="outline" @click="isDeleteModalOpen = false">Cancelar</UiButton>
          <UiButton variant="danger" :loading="isSaving" @click="handleDeleteSubmit">Eliminar</UiButton>
        </div>
      </template>
    </UiCard>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { roleService } from '@/services/role.service';
import type { Role, Permission } from '@/types/role';
import { useAuthStore } from '@/stores/auth.store';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiModal from '@/components/ui/UiModal.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiDualListbox from '@/components/ui/UiDualListbox.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import { useToast } from '@/composables/useToast';
import { Permissions } from '@/constants/permissions';
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

const authStore = useAuthStore();
const toast = useToast();
const roles = ref<Role[]>([]);
const allPermissions = ref<Permission[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMsg = ref('');

const isModalOpen = ref(false);
const form = reactive({ name: '', description: '', color: '', permissionIds: [] as string[] });

const isEditModalOpen = ref(false);
const editForm = reactive({ id: '', name: '', description: '', color: '', permissionIds: [] as string[] });

const isDeleteModalOpen = ref(false);
const deleteTarget = ref<{ id: string; name: string } | null>(null);

const expandedModules = ref<Record<string, Set<string>>>({});

const allPermissionItems = computed(() =>
  allPermissions.value.map((p) => ({
    id: p.id,
    label: p.name || p.code,
    description: p.code,
  }))
);

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

const MODULE_COLORS: Record<string, string> = {
  auth: '#ef4444',
  users: '#3b82f6',
  roles: '#8b5cf6',
  company: '#06b6d4',
  settings: '#6b7280',
  profile: '#10b981',
  dashboard: '#f59e0b',
  branches: '#ec4899',
  audit: '#f97316',
  billing: '#14b8a6',
  notifications: '#a855f7',
  integrations: '#6366f1',
};

function getRoleDescription(name: string): string {
  return ROLE_DESCRIPTIONS[name] || 'Rol personalizado de la organización.';
}

function getModuleName(code: string): string {
  return MODULE_LABELS[code] || code;
}

function groupPermissionsByModule(perms: Permission[]): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const p of perms) {
    if (!groups[p.module]) groups[p.module] = [];
    groups[p.module]!.push(p);
  }
  return groups;
}

function toggleModule(roleId: string, module: string) {
  if (!expandedModules.value[roleId]) expandedModules.value[roleId] = new Set();
  const set = expandedModules.value[roleId]!;
  if (set.has(module)) set.delete(module);
  else set.add(module);
}

function isModuleExpanded(roleId: string, module: string): boolean {
  return expandedModules.value[roleId]?.has(module) ?? true;
}

const editSnapshot = ref('');

const editableRoleFields = () => ({
  name: editForm.name,
  description: editForm.description,
  color: editForm.color,
  permissionIds: [...editForm.permissionIds],
});

const snapshotEditForm = () => {
  editSnapshot.value = JSON.stringify(editableRoleFields());
};

const isEditDirty = computed(() =>
  JSON.stringify(editableRoleFields()) !== editSnapshot.value
);

function openEditModal(role: Role) {
  editForm.id = role.id;
  editForm.name = role.name;
  editForm.description = role.description || '';
  editForm.color = role.color || '';
  editForm.permissionIds = role.permissions.map((p) => p.id);
  errorMsg.value = '';
  snapshotEditForm();
  isEditModalOpen.value = true;
}

function openDeleteModal(role: Role) {
  deleteTarget.value = { id: role.id, name: role.name };
  errorMsg.value = '';
  isDeleteModalOpen.value = true;
}

async function handleEditSubmit() {
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.updateRole(editForm.id, {
      name: editForm.name,
      description: editForm.description.trim() || undefined,
      color: editForm.color.trim() || undefined,
      permissionIds: editForm.permissionIds,
    });
    isEditModalOpen.value = false;
    toast.success('Rol actualizado correctamente');
    await fetchData();
  } catch (error: any) {
    console.error('Error actualizando rol:', error);
    errorMsg.value = error.response?.data?.message || error.response?.data?.error || 'Error al actualizar el rol';
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteSubmit() {
  if (!deleteTarget.value) return;
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.deleteRole(deleteTarget.value.id);
    isDeleteModalOpen.value = false;
    deleteTarget.value = null;
    toast.success('Rol eliminado correctamente');
    await fetchData();
  } catch (error: any) {
    console.error('Error eliminando rol:', error);
    errorMsg.value = error.response?.data?.message || error.response?.data?.error || 'Error al eliminar el rol';
  } finally {
    isSaving.value = false;
  }
}

const fetchData = async () => {
  if (!authStore.activeTenantId) return;
  try {
    const [rolesData, permsData] = await Promise.all([
      roleService.getRoles(),
      roleService.getAllPermissions()
    ]);
    roles.value = rolesData;
    allPermissions.value = permsData;
  } catch (error) {
    console.error('Error cargando datos', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

const createSnapshot = ref('');

const snapshotCreateForm = () => {
  createSnapshot.value = JSON.stringify({
    name: form.name,
    description: form.description,
    color: form.color,
    permissionIds: [...form.permissionIds],
  });
};

const isCreateDirty = computed(() =>
  JSON.stringify({
    name: form.name,
    description: form.description,
    color: form.color,
    permissionIds: [...form.permissionIds],
  }) !== createSnapshot.value
);

const openCreateModal = () => {
  form.name = ''; form.description = ''; form.color = ''; form.permissionIds = [];
  errorMsg.value = '';
  snapshotCreateForm();
  isModalOpen.value = true;
};

const handleCreateSubmit = async () => {
  if (!authStore.activeTenantId) return;
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.createRole({
      name: form.name,
      description: form.description.trim() || undefined,
      color: form.color.trim() || undefined,
      permissionIds: form.permissionIds
    });
    isModalOpen.value = false;
    toast.success('Rol creado correctamente');
    await fetchData();
  } catch (error: any) {
    console.error('Error creando rol', error);
    errorMsg.value = error.response?.data?.message || error.response?.data?.error || 'Error al crear el rol';
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.roles-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-6);
}

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
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.role-icon.custom {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-muted);
}

.role-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.role-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  margin-top: 2px;
}
.role-badge.system {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.role-badge.custom {
  background: var(--bg-app);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.role-title-text {
  display: flex;
  flex-direction: column;
}

.role-actions {
  flex-shrink: 0;
}

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

.module-group {
  border-bottom: 1px solid var(--border);
}
.module-group:last-child {
  border-bottom: none;
}

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
.module-header:hover {
  background: var(--bg-hover);
}

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
}
.dot-auth { background: #ef4444; }
.dot-users { background: #3b82f6; }
.dot-roles { background: #8b5cf6; }
.dot-company { background: #06b6d4; }
.dot-settings { background: #6b7280; }
.dot-profile { background: #10b981; }
.dot-dashboard { background: #f59e0b; }
.dot-branches { background: #ec4899; }
.dot-audit { background: #f97316; }
.dot-billing { background: #14b8a6; }
.dot-notifications { background: #a855f7; }
.dot-integrations { background: #6366f1; }

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
.module-chevron.rotated {
  transform: rotate(-90deg);
}

.module-perms {
  padding: 0 var(--space-4) var(--space-2);
}

.perm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  padding-left: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.perm-item:last-child {
  border-bottom: none;
}

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

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-6);
}

.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}
.skeleton-card-title { height: 22px; width: 45%; }
.skeleton-card-line { height: 14px; width: 100%; }
.skeleton-card-line.short { width: 65%; }

@keyframes skeleton-pulse {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.roles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-16) var(--space-4);
  color: var(--text-muted);
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.roles-empty p { font-size: var(--text-lg); font-weight: 500; color: var(--text-main); margin: 0; }
.roles-empty span { font-size: var(--text-sm); }

@media (max-width: 768px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}

</style>
