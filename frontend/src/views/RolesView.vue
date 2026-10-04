<template>
  <AuthenticatedLayout>
    <div class="roles-container">
      <UiPageHeader
        title="Roles y Permisos"
        subtitle="Consulta y crea niveles de acceso para tu organización."
      >
        <template #actions>
          <UiButton v-permission="Permissions.ROLES.CREATE" @click="openCreateModal" width="auto">
            <IconPlus :size="16" /> Crear Nuevo Rol
          </UiButton>
        </template>
      </UiPageHeader>

      <div
        v-if="isLoading"
        class="skeleton-grid"
        role="status"
        aria-busy="true"
      >
        <span class="sr-only">Cargando roles…</span>
        <div v-for="n in 3" :key="n" class="skeleton-card" aria-hidden="true">
          <div class="skeleton skeleton-card-title"></div>
          <div class="skeleton skeleton-card-line"></div>
          <div class="skeleton skeleton-card-line short"></div>
        </div>
      </div>

      <UiErrorState
        v-else-if="loadError"
        title="No pudimos cargar los roles"
        :description="loadError"
        @retry="fetchData"
      />

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
            <IconPlus :size="16" /> Crear Nuevo Rol
          </UiButton>
        </template>
      </UiEmptyState>

      <div v-else class="roles-grid">
        <RoleCard
          v-for="role in roles"
          :key="role.id"
          :role="role"
          @edit="openEditModal"
          @delete="openDeleteModal"
        />
      </div>
    </div>

    <UiFormModal
      v-model="isModalOpen"
      title="Crear Rol Personalizado"
      size="large"
      :confirm-on-dirty="true"
      :dirty="isCreateDirty"
      @submit="handleCreateSubmit"
    >
      <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
      <UiInput v-model="form.name" label="Nombre del Rol" placeholder="Ej: Gestor de Finanzas" required />
      <UiInput v-model="form.description" label="Descripción (Opcional)" placeholder="¿Qué hace este rol?" />
      <div class="color-row">
        <UiInput
          v-model="form.color"
          label="Color (Opcional)"
          placeholder="#8b5cf6"
          :error="createColorError"
        />
        <span
          class="color-preview"
          :style="colorPreviewStyle(form.color)"
          aria-hidden="true"
        ></span>
      </div>

      <UiDualListbox
        v-model="form.permissionIds"
        :available="allPermissionItems"
        :selected="allPermissionItems"
        label="Permisos"
        available-label="Disponibles"
        selected-label="Asignados al Rol"
      />

      <template #footer="{ requestClose }">
        <div class="modal-footer">
          <UiButton type="button" variant="outline" @click="requestClose">Cancelar</UiButton>
          <UiButton type="submit" :loading="isSaving">Guardar Rol</UiButton>
        </div>
      </template>
    </UiFormModal>

  <!-- Edit Modal -->
  <UiFormModal
    v-model="isEditModalOpen"
    title="Editar Rol"
    size="large"
    :confirm-on-dirty="true"
    :dirty="isEditDirty"
    @submit="handleEditSubmit"
  >
    <UiAlert v-if="errorMsg" type="error">{{ errorMsg }}</UiAlert>
    <UiInput v-model="editForm.name" label="Nombre del Rol" required />
    <UiInput v-model="editForm.description" label="Descripción (Opcional)" placeholder="¿Qué hace este rol?" />
    <div class="color-row">
      <UiInput
        v-model="editForm.color"
        label="Color (Opcional)"
        placeholder="#8b5cf6"
        :error="editColorError"
      />
      <span
        class="color-preview"
        :style="colorPreviewStyle(editForm.color)"
        aria-hidden="true"
      ></span>
    </div>
    <UiDualListbox
      v-model="editForm.permissionIds"
      :available="allPermissionItems"
      :selected="allPermissionItems"
      label="Permisos"
      available-label="Disponibles"
      selected-label="Asignados al Rol"
    />
    <template #footer="{ requestClose }">
      <div class="modal-footer">
        <UiButton type="button" variant="outline" @click="requestClose">Cancelar</UiButton>
        <UiButton type="submit" :loading="isSaving">Guardar Cambios</UiButton>
      </div>
    </template>
  </UiFormModal>

  <!-- Delete Confirmation Modal -->
  <UiConfirmDialog
    v-model="isDeleteModalOpen"
    title="Eliminar Rol"
    :loading="isSaving"
    :error="errorMsg"
    confirm-label="Eliminar"
    :require-typed-confirmation="deleteTarget?.name ?? null"
    @confirm="handleDeleteSubmit"
  >
    ¿Estás seguro de eliminar el rol <strong>{{ deleteTarget?.name }}</strong>? Esta acción
    no se puede deshacer y quitará el acceso a los miembros que lo tengan asignado.
  </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { roleService } from '@/services/role.service';
import type { Role, Permission } from '@/types/role';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useCreateAction } from '@/composables/useCreateAction';
import { useModal } from '@/composables/useModal';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiDualListbox from '@/components/ui/UiDualListbox.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiErrorState from '@/components/ui/UiErrorState.vue';
import RoleCard from '@/components/features/roles/RoleCard.vue';
import { useToast } from '@/composables/useToast';
import { Permissions } from '@/constants/permissions';
import { apiErrorMessage } from '@/utils/error';
import { IconShield, IconPlus } from '@tabler/icons-vue';

const toast = useToast();
const { companyId } = useCompanyPath();
const roles = ref<Role[]>([]);
const allPermissions = ref<Permission[]>([]);
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const isSaving = ref(false);
const errorMsg = ref('');

// --- Modales con useModal (consistente con MembersView/BranchesView) ---
const createModal = useModal();
const isModalOpen = createModal.isOpen;

const editModal = useModal<Role>();
const isEditModalOpen = editModal.isOpen;

const deleteModal = useModal<{ id: string; name: string }>();
const isDeleteModalOpen = deleteModal.isOpen;
const deleteTarget = deleteModal.target;

// --- Formularios ---
const form = reactive({ name: '', description: '', color: '', permissionIds: [] as string[] });
const editForm = reactive({ id: '', name: '', description: '', color: '', permissionIds: [] as string[] });

// El color es opcional, pero si se escribe debe ser un hex válido.
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
const createColorError = computed(() =>
  form.color.trim() && !hexColorRegex.test(form.color.trim())
    ? 'Formato inválido. Usa 6 dígitos hexadecimales, ej. #8b5cf6.'
    : null
);
const editColorError = computed(() =>
  editForm.color.trim() && !hexColorRegex.test(editForm.color.trim())
    ? 'Formato inválido. Usa 6 dígitos hexadecimales, ej. #8b5cf6.'
    : null
);
const colorPreviewStyle = (value: string) =>
  hexColorRegex.test(value.trim()) ? { backgroundColor: value.trim() } : undefined;

const allPermissionItems = computed(() =>
  allPermissions.value.map((p) => ({
    id: p.id,
    label: p.name || p.code,
    description: p.code,
  }))
);

const { isDirty: isCreateDirty, capture: snapshotCreateForm } = useDirtyForm(() => ({
  name: form.name,
  description: form.description,
  color: form.color,
  permissionIds: [...form.permissionIds],
}));

const { isDirty: isEditDirty, capture: snapshotEditForm } = useDirtyForm(() => ({
  name: editForm.name,
  description: editForm.description,
  color: editForm.color,
  permissionIds: [...editForm.permissionIds],
}));

// --- Crear ---
const openCreateModal = () => {
  form.name = ''; form.description = ''; form.color = ''; form.permissionIds = [];
  errorMsg.value = '';
  snapshotCreateForm();
  createModal.open();
};

const handleCreateSubmit = async () => {
  if (!companyId.value) return;
  if (createColorError.value) { errorMsg.value = createColorError.value; return; }
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.createRole({
      name: form.name,
      description: form.description.trim() || undefined,
      color: form.color.trim() || undefined,
      permissionIds: form.permissionIds,
    });
    createModal.close();
    toast.success('Rol creado correctamente');
    await fetchData();
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'Error al crear el rol');
  } finally {
    isSaving.value = false;
  }
};

// --- Editar ---
function openEditModal(role: Role) {
  editForm.id = role.id;
  editForm.name = role.name;
  editForm.description = role.description || '';
  editForm.color = role.color || '';
  editForm.permissionIds = role.permissions.map((p) => p.id);
  errorMsg.value = '';
  snapshotEditForm();
  editModal.open(role);
}

async function handleEditSubmit() {
  if (editColorError.value) { errorMsg.value = editColorError.value; return; }
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.updateRole(editForm.id, {
      name: editForm.name,
      description: editForm.description.trim() || undefined,
      color: editForm.color.trim() || undefined,
      permissionIds: editForm.permissionIds,
    });
    editModal.close();
    toast.success('Rol actualizado correctamente');
    await fetchData();
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'Error al actualizar el rol');
  } finally {
    isSaving.value = false;
  }
}

// --- Eliminar ---
function openDeleteModal(role: Role) {
  errorMsg.value = '';
  deleteModal.open({ id: role.id, name: role.name });
}

async function handleDeleteSubmit() {
  if (!deleteTarget.value) return;
  isSaving.value = true;
  errorMsg.value = '';
  try {
    await roleService.deleteRole(deleteTarget.value.id);
    deleteModal.reset();
    toast.success('Rol eliminado correctamente');
    await fetchData();
  } catch (error: any) {
    errorMsg.value = apiErrorMessage(error, 'Error al eliminar el rol');
  } finally {
    isSaving.value = false;
  }
}

// --- Fetch ---
const fetchData = async () => {
  if (!companyId.value) return;
  isLoading.value = true;
  loadError.value = null;
  try {
    const [rolesData, permsData] = await Promise.all([
      roleService.getRoles(),
      roleService.getAllPermissions(),
    ]);
    roles.value = rolesData;
    allPermissions.value = permsData;
  } catch (error) {
    loadError.value = apiErrorMessage(error, 'No pudimos cargar los roles');
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);
useCreateAction(() => openCreateModal());
</script>

<style scoped>
/* Estilos propios de RolesView.
   Todo lo visual de cada tarjeta (role-card-header, module-group, perm-item…)
   vive en RoleCard.vue (scoped allí). Solo quedan aquí los estilos
   del contenedor y del formulario de crear/editar. */

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

/* Input de color + muestra en vivo del tono elegido. */
.color-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}

.color-row > :first-child {
  flex: 1;
  min-width: 0;
}

.color-preview {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background-color: var(--bg-app);
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

@media (max-width: 768px) {
  .roles-grid,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
