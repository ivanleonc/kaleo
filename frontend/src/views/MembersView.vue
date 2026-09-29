<template>
  <AuthenticatedLayout>
    <div class="members-container">
      <UiPageHeader
        title="Miembros del Equipo"
        subtitle="Gestiona los accesos y roles de los usuarios en tu organización."
      >
        <template #actions>
          <UiButton v-permission="Permissions.USERS.CREATE" @click="openAddModal" width="auto">
            <IconPlus :size="16" /> Nuevo Miembro
          </UiButton>
        </template>
      </UiPageHeader>

      <div class="filters-bar">
        <div class="filter-group filter-group-grow">
          <UiSearchInput v-model="searchQuery" placeholder="Buscar por nombre o email..." />
        </div>
        <div class="filter-group">
          <UiSelect v-model="filterRole" :options="roleFilterOptions" />
        </div>
        <div class="filter-group">
          <UiSelect v-model="filterStatus" :options="statusFilterOptions" />
        </div>
        <button v-if="hasActiveFilters" class="clear-btn" @click="clearFilters">
          <IconX :size="14" /> Limpiar
        </button>
      </div>

      <div class="table-section">
        <UiDataTable
          :columns="memberColumns"
          :rows="filteredMembers"
          :loading="isInitialLoading"
          :empty-title="memberStore.members.length === 0 ? 'No hay miembros todavía' : 'Sin resultados'"
          :empty-description="memberStore.members.length === 0
            ? 'Invita a tu primera persona al equipo para empezar.'
            : 'Prueba con otra búsqueda o limpia los filtros.'"
        >
          <template #cell-name="{ row }">
            <div class="user-cell">
              <div class="user-avatar">
                <img v-if="row.avatar_url" :src="row.avatar_url" :alt="row.name" />
                <span v-else>{{ getInitials(row.name) }}</span>
              </div>
              <div class="user-cell-text">
                <span class="font-medium truncate" :title="row.name">{{ row.name }}</span>
                <span v-if="row.position" class="user-cell-sub truncate" :title="row.position">{{ row.position }}</span>
              </div>
            </div>
          </template>
          <template #cell-email="{ row }">
            <span class="truncate" :title="row.email">{{ row.email }}</span>
          </template>
          <template #cell-roles="{ row }">
            <div class="roles-cell">
              <span v-for="role in row.roles" :key="role" class="badge-role"
                :class="{ 'owner-badge': role === 'Owner' || role === 'owner' }">
                <IconCrown v-if="role === 'Owner' || role === 'owner'" :size="12" stroke-width="2" class="owner-icon" />
                {{ role }}
              </span>
            </div>
          </template>
          <template #cell-status="{ row }">
            <div class="status-cell">
              <span class="badge-status" :class="row.status || 'active'">
                {{ statusLabel(row.status) }}
              </span>
              <span
                v-if="row.must_change_password"
                class="badge-temp"
                title="Aún usa contraseña temporal: no ha completado el cambio"
              >
                Temporal
              </span>
            </div>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions" v-permission="Permissions.USERS.UPDATE">
              <UiDropdown align="end" label="Acciones del miembro">
                <template #trigger="{ toggle }">
                  <button class="dots-btn" @click.stop="toggle" aria-haspopup="menu" :aria-label="`Acciones para ${row.name}`">
                    <IconDotsVertical :size="16" stroke-width="1.8" />
                  </button>
                </template>
                <template #default>
                  <UiDropdownItem @click="openEditModal(row)">
                    <IconPencil :size="14" stroke-width="1.8" />
                    <span>Editar</span>
                  </UiDropdownItem>
                  <UiDropdownItem @click="openResetPasswordModal(row)">
                    <IconKey :size="14" stroke-width="1.8" />
                    <span>Resetear Contraseña</span>
                  </UiDropdownItem>
                  <UiDropdownItem @click="openResetPasswordEmailModal(row)">
                    <IconMail :size="14" stroke-width="1.8" />
                    <span>Resetear y enviar al correo</span>
                  </UiDropdownItem>
                  <div class="ui-dropdown-divider" role="separator"></div>
                  <UiDropdownItem danger @click="handleDelete(row.id, row.name)" v-permission="Permissions.USERS.DELETE">
                    <IconTrash :size="14" stroke-width="1.8" />
                    <span>Eliminar</span>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </template>
          <template #empty-icon>
            <IconUsers :size="48" stroke-width="1.5" />
          </template>
          <template #empty-action>
            <UiButton
              v-if="memberStore.members.length === 0"
              v-permission="Permissions.USERS.CREATE"
              width="auto"
              @click="openAddModal"
            >
              <IconPlus :size="16" /> Nuevo Miembro
            </UiButton>
          </template>
        </UiDataTable>
      </div>

      <!-- Add Member Modal -->
      <UiModal v-model="isAddModalOpen" size="large" :confirm-on-dirty="true" :dirty="isAddDirty">
        <form @submit.prevent="handleAddSubmit">
          <UiCard>
            <template #header>
              <h3 class="card-title">Invitar Miembro</h3>
              <p class="card-description">Agrega un nuevo miembro a tu equipo.</p>
            </template>
            <div class="form-body">
              <UiAlert v-if="memberStore.error">{{ memberStore.error }}</UiAlert>
              <div v-if="newMemberCredentials" class="credentials-box">
                <p class="credentials-title">Miembro Agregado!</p>
                <p class="credentials-warning">Copia esta contraseña ahora: no podrás volver a verla.</p>
                <p><strong>Usuario:</strong> {{ newMemberCredentials.email }}</p>
                <p class="password-row">
                  <strong>Clave:</strong>
                  <code class="secret-code">{{ newMemberCredentials.password }}</code>
                  <button type="button" class="copy-btn" @click="copyToClipboard(newMemberCredentials.password)" title="Copiar contraseña">
                    <IconCopy :size="14" stroke-width="1.8" />
                  </button>
                </p>
              </div>
              <template v-else>
                <UiInput v-model="addForm.name" label="Nombre Completo" required />
                <UiInput v-model="addForm.email" label="Correo Electrónico" type="email" required />
                <div class="form-row">
                  <UiInput v-model="addForm.phone" label="Teléfono (Opcional)" type="text" autocomplete="tel" />
                  <UiInput v-model="addForm.position" label="Cargo (Opcional)" type="text" />
                </div>
                <div class="form-row">
                  <UiInput v-model="addForm.document_type" label="Tipo Doc. (Opcional)" type="text" placeholder="CC" />
                  <UiInput v-model="addForm.document_number" label="Núm. Documento (Opcional)" type="text" />
                </div>
                <UiDualListbox
                  v-model="addForm.roleIds"
                  :available="roleItems"
                  :selected="roleItems"
                  label="Roles"
                  available-label="Disponibles"
                  selected-label="Asignados"
                />
              </template>
            </div>
            <template #footer>
              <div class="modal-footer">
                <UiButton type="button" variant="outline" @click="isAddModalOpen = false">
                  {{ newMemberCredentials ? 'Cerrar' : 'Cancelar' }}
                </UiButton>
                <UiButton v-if="!newMemberCredentials" type="submit" :loading="memberStore.isLoading">
                  Agregar al Equipo
                </UiButton>
              </div>
            </template>
          </UiCard>
        </form>
      </UiModal>

      <!-- Edit Member Modal -->
      <UiModal v-model="isEditModalOpen" size="large" :confirm-on-dirty="true" :dirty="isEditDirty">
        <form @submit.prevent="handleEditSubmit">
          <UiCard>
            <template #header>
              <h3 class="card-title">Editar Miembro</h3>
              <p class="card-description">Modificando accesos para: <strong>{{ editForm.name }}</strong></p>
            </template>
            
            <div class="form-body">
              <UiAlert v-if="memberStore.error">{{ memberStore.error }}</UiAlert>
              <UiSelect
                v-model="editForm.status"
                label="Estado de la Cuenta"
                :options="statusOptions"
              />
              <UiInput v-model="editForm.phone" label="Teléfono" type="text" autocomplete="tel" />
              <UiInput v-model="editForm.position" label="Cargo" type="text" />
              <div class="form-row">
                <UiInput v-model="editForm.document_type" label="Tipo Doc." type="text" placeholder="CC" />
                <UiInput v-model="editForm.document_number" label="Núm. Documento" type="text" />
              </div>

              <UiDualListbox
                v-model="editForm.roleIds"
                :available="roleItems"
                :selected="roleItems"
                label="Roles"
                available-label="Disponibles"
                selected-label="Asignados"
              />
            </div>

            <template #footer>
              <div class="modal-footer">
                <UiButton type="button" variant="outline" @click="isEditModalOpen = false">
                  Cancelar
                </UiButton>
                <UiButton type="submit" :loading="memberStore.isLoading">
                  Guardar Cambios
                </UiButton>
              </div>
            </template>
          </UiCard>
        </form>
      </UiModal>

    </div>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="isDeleteModalOpen">
      <UiCard>
        <template #header>
          <h3 class="card-title">Eliminar Miembro</h3>
          <p class="card-description">¿Deseas remover a <strong>{{ deleteTarget?.name }}</strong> del equipo? Su cuenta se conserva, solo perderá el acceso a esta empresa.</p>
        </template>
        <UiAlert v-if="memberStore.error">{{ memberStore.error }}</UiAlert>
        <template #footer>
          <div class="modal-footer">
            <UiButton variant="outline" @click="isDeleteModalOpen = false">Cancelar</UiButton>
            <UiButton variant="danger" :loading="memberStore.isLoading" @click="confirmDelete">
              Eliminar
            </UiButton>
          </div>
        </template>
      </UiCard>
    </UiModal>

    <!-- Reset Password Confirmation Modal -->
    <UiModal v-model="isResetModalOpen">
      <UiCard>
        <template #header>
          <h3 class="card-title">Resetear Contraseña</h3>
          <p class="card-description">Se generará una nueva contraseña temporal para <strong>{{ resetTarget?.name }}</strong>. Deberá cambiarla en su próximo inicio de sesión.</p>
        </template>
        <UiAlert v-if="memberStore.error">{{ memberStore.error }}</UiAlert>
        <template #footer>
          <div class="modal-footer">
            <UiButton variant="outline" @click="isResetModalOpen = false">Cancelar</UiButton>
            <UiButton :loading="memberStore.isLoading" @click="confirmResetPassword">
              Resetear Contraseña
            </UiButton>
          </div>
        </template>
      </UiCard>
    </UiModal>

    <!-- Reset Password Success Modal -->
    <UiModal v-model="isResetSuccessModalOpen">
      <UiCard>
        <template #header>
          <h3 class="card-title">Contraseña Reseteada</h3>
          <p class="card-description">Comparte esta contraseña temporal con el usuario de forma segura.</p>
        </template>
        <div v-if="resetResult" class="credentials-box">
          <p class="credentials-title">Nueva Contraseña Temporal</p>
          <p><strong>Usuario:</strong> {{ resetTarget?.email }}</p>
          <p class="password-row">
            <strong>Clave:</strong>
            <code class="secret-code">{{ resetResult.temporary_password }}</code>
            <button type="button" class="copy-btn" @click="copyToClipboard(resetResult.temporary_password)" title="Copiar contraseña">
              <IconCopy :size="14" stroke-width="1.8" />
            </button>
          </p>
        </div>
        <template #footer>
          <div class="modal-footer">
            <UiButton @click="isResetSuccessModalOpen = false">Cerrar</UiButton>
          </div>
        </template>
      </UiCard>
    </UiModal>

    <!-- Reset Password + Email Confirmation Modal -->
    <UiModal v-model="isResetEmailModalOpen">
      <UiCard>
        <template #header>
          <h3 class="card-title">Resetear y Enviar por Correo</h3>
          <p class="card-description">Se generará una nueva contraseña temporal para <strong>{{ resetEmailTarget?.name }}</strong> y se enviará a su correo electrónico.</p>
        </template>
        <UiAlert v-if="memberStore.error">{{ memberStore.error }}</UiAlert>
        <template #footer>
          <div class="modal-footer">
            <UiButton variant="outline" @click="isResetEmailModalOpen = false">Cancelar</UiButton>
            <UiButton :loading="memberStore.isLoading" @click="confirmResetPasswordEmail">
              Enviar Contraseña
            </UiButton>
          </div>
        </template>
      </UiCard>
    </UiModal>

    <!-- Reset Password + Email Success Modal -->
    <UiModal v-model="isResetEmailSuccessModalOpen">
      <UiCard>
        <template #header>
          <h3 class="card-title">Contraseña Enviada</h3>
          <p class="card-description">La nueva contraseña temporal fue enviada al correo del usuario.</p>
        </template>
        <div v-if="resetEmailResult" class="credentials-box">
          <p class="credentials-title">Correo Enviado</p>
          <p><strong>Destinatario:</strong> {{ resetEmailResult.email }}</p>
        </div>
        <template #footer>
          <div class="modal-footer">
            <UiButton @click="isResetEmailSuccessModalOpen = false">Cerrar</UiButton>
          </div>
        </template>
      </UiCard>
    </UiModal>

  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, computed } from 'vue';
import { useMemberStore } from '@/stores/member.store';
import { roleService, type Role } from '@/services/role.service';
import { useAuthStore } from '@/stores/auth.store';
import { Permissions } from '@/constants/permissions';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiModal from '@/components/ui/UiModal.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiDualListbox from '@/components/ui/UiDualListbox.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import { useToast } from '@/composables/useToast';
import { IconCrown, IconPlus, IconDotsVertical, IconPencil, IconTrash, IconKey, IconMail, IconCopy, IconUsers, IconX } from '@tabler/icons-vue';

const authStore = useAuthStore();
const memberStore = useMemberStore();
const toast = useToast();
const availableRoles = ref<Role[]>([]);

const roleItems = computed(() =>
  availableRoles.value.map((r) => ({
    id: r.id,
    label: r.name,
    description: r.is_system ? 'Sistema' : 'Personalizado',
  }))
);

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  toast.success('Contraseña copiada al portapapeles');
};

const searchQuery = ref('');
const filterRole = ref('');
const filterStatus = ref('');

const isInitialLoading = computed(() => memberStore.isLoading && memberStore.members.length === 0);

const memberColumns = [
  { key: 'name', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'roles', label: 'Rol' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: '', align: 'right' as const },
];

const hasActiveFilters = computed(() => searchQuery.value || filterRole.value || filterStatus.value);

const roleFilterOptions = computed(() => [
  { label: 'Todos los roles', value: '' },
  ...availableRoles.value.map((r) => ({ label: r.name, value: r.name })),
]);

const statusFilterOptions = computed(() => [
  { label: 'Todos los estados', value: '' },
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' },
]);

const filteredMembers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return memberStore.members.filter((m: any) => {
    if (filterRole.value && !(m.roles || []).includes(filterRole.value)) return false;
    if (filterStatus.value && (m.status || 'active') !== filterStatus.value) return false;
    if (query && !`${m.name || ''} ${m.email || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
});

const clearFilters = () => {
  searchQuery.value = '';
  filterRole.value = '';
  filterStatus.value = '';
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
};

const statusLabel = (status?: string): string => {
  if (status === 'inactive') return 'Inactivo';
  if (status === 'pending') return 'Pendiente';
  return 'Activo';
};

const isSelf = (memberId: string): boolean => authStore.user?.id === memberId;

// --- ADD MEMBER ---
const isAddModalOpen = ref(false);
const addForm = reactive({
  name: '',
  email: '',
  roleIds: [] as string[],
  phone: '',
  position: '',
  document_type: '',
  document_number: '',
});
const newMemberCredentials = ref<{ email: string; password: string } | null>(null);

onMounted(async () => {
  if (authStore.activeTenantId) {
    await Promise.all([
      memberStore.fetchMembers(),
      roleService.getRoles().then(r => availableRoles.value = r)
    ]);
  }
});

const addSnapshot = ref('');

const snapshotAddForm = () => {
  addSnapshot.value = JSON.stringify({
    name: addForm.name,
    email: addForm.email,
    roleIds: [...addForm.roleIds],
    phone: addForm.phone,
    position: addForm.position,
    document_type: addForm.document_type,
    document_number: addForm.document_number,
  });
};

const isAddDirty = computed(() =>
  JSON.stringify({
    name: addForm.name,
    email: addForm.email,
    roleIds: [...addForm.roleIds],
    phone: addForm.phone,
    position: addForm.position,
    document_type: addForm.document_type,
    document_number: addForm.document_number,
  }) !== addSnapshot.value
);

const openAddModal = () => {
  addForm.name = '';
  addForm.email = '';
  addForm.roleIds = [];
  addForm.phone = '';
  addForm.position = '';
  addForm.document_type = '';
  addForm.document_number = '';
  newMemberCredentials.value = null;
  memberStore.error = null;
  snapshotAddForm();
  isAddModalOpen.value = true;
};

const handleAddSubmit = async () => {
  newMemberCredentials.value = null;
  try {
    const payload = {
      name: addForm.name,
      email: addForm.email,
      roleIds: addForm.roleIds,
      phone: addForm.phone.trim() || undefined,
      position: addForm.position.trim() || undefined,
      document_type: addForm.document_type.trim() || undefined,
      document_number: addForm.document_number.trim() || undefined,
    };

    const data = await memberStore.addMember(payload);
    if (!data?.email || !data?.temporary_password) {
      throw new Error('Respuesta inválida del servidor al crear el miembro');
    }
    newMemberCredentials.value = { email: data.email, password: data.temporary_password };

    addForm.name = '';
    addForm.email = '';
    addForm.roleIds = [];
    addForm.phone = '';
    addForm.position = '';
    addForm.document_type = '';
    addForm.document_number = '';
  } catch (error) {
    console.error('Error al agregar miembro:', error);
  }
};

// --- EDIT MEMBER ---
const isEditModalOpen = ref(false);
const editForm = reactive({
  id: '',
  name: '',
  roleIds: [] as string[],
  status: 'active' as 'active' | 'inactive',
  phone: '',
  position: '',
  document_type: '',
  document_number: '',
});

const statusOptions = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' }
];

const editSnapshot = ref('');

const editableContactFields = () => ({
  roleIds: [...editForm.roleIds],
  status: editForm.status,
  phone: editForm.phone,
  position: editForm.position,
  document_type: editForm.document_type,
  document_number: editForm.document_number,
});

const snapshotEditForm = () => {
  editSnapshot.value = JSON.stringify(editableContactFields());
};

const isEditDirty = computed(() =>
  JSON.stringify(editableContactFields()) !== editSnapshot.value
);

const openEditModal = (member: any) => {
  if (isSelf(member.id)) {
    toast.error('No puedes modificar tu propio acceso. Pide a otro administrador que lo haga.');
    return;
  }
  editForm.id = member.id;
  editForm.name = member.name;
  editForm.status = member.status || 'active';
  editForm.phone = member.phone || '';
  editForm.position = member.position || '';
  editForm.document_type = member.document_type || '';
  editForm.document_number = member.document_number || '';

  if (member.roles && member.roles.length > 0) {
    editForm.roleIds = availableRoles.value
      .filter(role => member.roles.includes(role.name))
      .map(role => role.id);
  } else {
    editForm.roleIds = [];
  }

  memberStore.error = null;
  snapshotEditForm();
  isEditModalOpen.value = true;
};

const handleEditSubmit = async () => {
  try {
    await memberStore.updateMember(editForm.id, {
      roleIds: editForm.roleIds,
      status: editForm.status,
      phone: editForm.phone.trim() || undefined,
      position: editForm.position.trim() || undefined,
      document_type: editForm.document_type.trim() || undefined,
      document_number: editForm.document_number.trim() || undefined,
    });
    isEditModalOpen.value = false;
    toast.success('Miembro actualizado correctamente');
  } catch (error) {
    console.error('Error al editar miembro:', error);
  }
};

// --- DELETE MEMBER ---
const isDeleteModalOpen = ref(false);
const deleteTarget = ref<{ id: string; name: string } | null>(null);

const handleDelete = async (userId: string, userName: string) => {
  if (isSelf(userId)) {
    toast.error('No puedes eliminarte a ti mismo del equipo.');
    return;
  }
  deleteTarget.value = { id: userId, name: userName };
  memberStore.error = null;
  isDeleteModalOpen.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  try {
    await memberStore.removeMember(deleteTarget.value.id);
    isDeleteModalOpen.value = false;
    deleteTarget.value = null;
    toast.success('Miembro removido del equipo');
  } catch (error) {
    console.error('Error al eliminar:', error);
  }
};

// --- RESET PASSWORD ---
const isResetModalOpen = ref(false);
const isResetSuccessModalOpen = ref(false);
const resetTarget = ref<{ id: string; name: string; email: string } | null>(null);
const resetResult = ref<{ temporary_password: string } | null>(null);

const openResetPasswordModal = (member: any) => {
  resetTarget.value = { id: member.id, name: member.name, email: member.email };
  resetResult.value = null;
  memberStore.error = null;
  isResetModalOpen.value = true;
};

const confirmResetPassword = async () => {
  if (!resetTarget.value) return;
  try {
    const result = await memberStore.resetPassword(resetTarget.value.id);
    resetResult.value = result;
    isResetModalOpen.value = false;
    isResetSuccessModalOpen.value = true;
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
  }
};

// --- RESET PASSWORD + EMAIL ---
const isResetEmailModalOpen = ref(false);
const isResetEmailSuccessModalOpen = ref(false);
const resetEmailTarget = ref<{ id: string; name: string; email: string } | null>(null);
const resetEmailResult = ref<{ email: string } | null>(null);

const openResetPasswordEmailModal = (member: any) => {
  resetEmailTarget.value = { id: member.id, name: member.name, email: member.email };
  resetEmailResult.value = null;
  memberStore.error = null;
  isResetEmailModalOpen.value = true;
};

const confirmResetPasswordEmail = async () => {
  if (!resetEmailTarget.value) return;
  try {
    const result = await memberStore.resetPasswordAndSendEmail(resetEmailTarget.value.id);
    resetEmailResult.value = result;
    isResetEmailModalOpen.value = false;
    isResetEmailSuccessModalOpen.value = true;
  } catch (error) {
    console.error('Error al resetear y enviar contraseña:', error);
  }
};
</script>

<style scoped>
.members-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.roles-cell { display: flex; gap: var(--space-1); flex-wrap: wrap; }

.status-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.badge-temp {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
  border: 1px solid rgba(234, 179, 8, 0.35);
  white-space: nowrap;
}
.owner-icon { color: var(--accent-amber); margin-right: 4px; }

.password-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.15s;
}
.copy-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.credentials-warning {
  font-size: var(--text-sm);
  color: var(--accent-amber, var(--text-muted));
  margin-bottom: var(--space-2);
}



</style>
