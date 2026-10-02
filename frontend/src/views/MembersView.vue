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

      <UiTableFilters v-model="memberFilterValues" :filters="memberFilterDefs" />

      <div class="table-section">
        <UiDataTable
          :table="memberTable"
          :loading="isInitialLoading"
          :error="memberStore.error"
          error-title="No pudimos cargar los miembros"
          @retry="memberStore.fetchMembers()"
          :empty-title="memberStore.members.length === 0 ? 'No hay miembros todavía' : 'Sin resultados'"
          :empty-description="memberStore.members.length === 0
            ? 'Invita a tu primera persona al equipo para empezar.'
            : 'Prueba con otra búsqueda o limpia los filtros.'"
        >
          <template #cell-name="{ row }">
            <div class="user-cell">
              <UiAvatar :src="row.avatar_url" :name="row.name" size="sm" />
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
              <UiBadge
                v-for="role in row.roles"
                :key="role"
                :variant="isOwnerRole(role) ? 'warning' : 'neutral'"
                size="sm"
              >
                <IconCrown v-if="isOwnerRole(role)" :size="12" stroke-width="2" />
                {{ role }}
              </UiBadge>
            </div>
          </template>
          <template #cell-status="{ row }">
            <div class="status-cell">
              <UiBadge :variant="statusVariant(row.status)" size="sm">
                {{ statusLabel(row.status) }}
              </UiBadge>
              <UiBadge
                v-if="row.must_change_password"
                variant="warning"
                size="sm"
                title="Aún usa contraseña temporal: no ha completado el cambio"
              >
                Temporal
              </UiBadge>
            </div>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions" v-permission="Permissions.USERS.UPDATE">
              <UiDropdown align="end" label="Acciones del miembro">
                <template #trigger="{ toggle, triggerAria }">
                  <button
                    class="dots-btn"
                    @click.stop="toggle"
                    v-bind="triggerAria"
                    :aria-label="`Acciones para ${row.name}`"
                  >
                    <IconDotsVertical :size="16" stroke-width="1.8" />
                  </button>
                </template>
                <template #default>
                  <UiDropdownItem @click="openEditModal(row)">
                    <IconPencil :size="14" stroke-width="1.8" />
                    <span>Editar</span>
                  </UiDropdownItem>
                  <UiDropdownItem @click="openResetPasswordModal(row)" v-permission="Permissions.USERS.UPDATE">
                    <IconKey :size="14" stroke-width="1.8" />
                    <span>Resetear contraseña</span>
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

      <!-- Pagination -->
      <UiPagination
        :page="memberStore.page"
        :total="memberStore.total"
        :limit="memberStore.limit"
        show-page-size
        @update:page="memberStore.goToPage"
        @update:limit="memberStore.setLimit"
      />

      <!-- Add Member Modal -->
      <UiFormModal
        v-model="isAddModalOpen"
        title="Invitar Miembro"
        description="Agrega un nuevo miembro a tu equipo. La contraseña temporal se enviará a su correo."
        size="large"
        :confirm-on-dirty="true"
        :dirty="isAddDirty"
        @submit="handleAddSubmit"
      >
        <UiAlert v-if="memberStore.error" type="error">{{ memberStore.error }}</UiAlert>
        <UiInput v-model="addForm.name" label="Nombre Completo" required />
        <UiInput v-model="addForm.email" label="Correo Electrónico" type="email" required :error="addEmailError" />
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
        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">Cancelar</UiButton>
            <UiButton type="submit" :loading="memberStore.isLoading">Agregar al Equipo</UiButton>
          </div>
        </template>
      </UiFormModal>

      <!-- Edit Member Modal -->
      <UiFormModal
        v-model="isEditModalOpen"
        title="Editar Miembro"
        :description="`Modificando accesos para: ${editForm.name}`"
        size="large"
        :confirm-on-dirty="true"
        :dirty="isEditDirty"
        @submit="handleEditSubmit"
      >
        <UiAlert v-if="memberStore.error" type="error">{{ memberStore.error }}</UiAlert>
        <UiInput :model-value="editForm.name" label="Nombre (no editable)" disabled />
        <UiSelect
          v-model="editForm.status"
          label="Estado de la Cuenta"
          :options="statusOptions"
        />
        <UiInput v-model="editForm.phone" label="Teléfono" type="tel" autocomplete="tel" />
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

        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">
              Cancelar
            </UiButton>
            <UiButton type="submit" :loading="memberStore.isLoading">
              Guardar Cambios
            </UiButton>
          </div>
        </template>
      </UiFormModal>

    </div>

    <!-- Delete Confirmation Modal -->
    <UiConfirmDialog
      v-model="isDeleteModalOpen"
      title="Eliminar Miembro"
      :loading="memberStore.isLoading"
      :error="memberStore.error"
      confirm-label="Eliminar"
      @confirm="confirmDelete"
    >
      Esto revocará el acceso de <strong>{{ deleteTarget?.name }}</strong> a esta empresa.
      Su cuenta se conserva y podrá ser invitado de nuevo.
    </UiConfirmDialog>

    <!-- Reset Password Confirmation Modal (siempre envía por correo) -->
    <UiConfirmDialog
      v-model="isResetModalOpen"
      title="Resetear Contraseña"
      variant="primary"
      :loading="memberStore.isLoading"
      :error="memberStore.error"
      confirm-label="Resetear y Enviar"
      @confirm="confirmResetPassword"
    >
      Se generará una nueva contraseña temporal para <strong>{{ resetTarget?.name }}</strong>
      y se enviará a <strong>{{ resetTarget?.email }}</strong>.
      Esto invalidará su contraseña actual de forma inmediata.
    </UiConfirmDialog>

  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, computed, watch } from 'vue';
import { useMemberStore } from '@/stores/member.store';
import { roleService, type Role } from '@/services/role.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { Permissions } from '@/constants/permissions';
import { useModal } from '@/composables/useModal';
import { useMemberColumns } from '@/composables/useMemberColumns';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiModal from '@/components/ui/UiModal.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiDualListbox from '@/components/ui/UiDualListbox.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiTableFilters, { type TableFilterDef } from '@/components/ui/UiTableFilters.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import { emptyToUndefined } from '@/utils/text';
import { useClipboard } from '@/composables/useClipboard';
import { useFilterSync } from '@/composables/useFilterSync';
import { useDirtyForm } from '@/composables/useDirtyForm';
import {
  useAppTable,
  useSortingState,
  useControlledSorting,
  sortingStateToServer,
} from '@/composables/useAppTable';
import type { Member } from '@/types/member';
import type { BadgeVariant } from '@/types/ui';
import { useToast } from '@/composables/useToast';
import { useCreateAction } from '@/composables/useCreateAction';
import { IconCrown, IconPlus, IconDotsVertical, IconPencil, IconTrash, IconKey, IconUsers } from '@tabler/icons-vue';

const authStore = useAuthStore();
const memberStore = useMemberStore();
const toast = useToast();
const availableRoles = ref<Role[]>([]);
const { companyId } = useCompanyPath();

const roleItems = computed(() =>
  availableRoles.value.map((r) => ({
    id: r.id,
    label: r.name,
    description: r.is_system ? 'Sistema' : 'Personalizado',
  }))
);

const { copyToClipboard } = useClipboard();

// El filtrado ocurre en el servidor para que page/total sigan siendo
// coherentes. Un solo watcher profundo (useFilterSync) cubre todas las
// claves: ningún filtro queda "muerto" sin trigger.
const memberFilterValues = ref({ search: '', roleId: '', status: '' });

watch(companyId, (newId, oldId) => {
  if (newId !== oldId && newId) {
    memberFilterValues.value = { search: '', roleId: '', status: '' };
  }
});

const memberFilterDefs = computed<TableFilterDef[]>(() => [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar miembros',
    placeholder: 'Buscar por nombre o email...',
    grow: true,
  },
  {
    key: 'roleId',
    type: 'select',
    label: 'Filtrar por rol',
    options: [
      { label: 'Todos los roles', value: '' },
      ...availableRoles.value.map((r) => ({ label: r.name, value: r.id })),
    ],
  },
  {
    key: 'status',
    type: 'select',
    label: 'Filtrar por estado',
    options: [
      { label: 'Todos los estados', value: '' },
      { label: 'Activo', value: 'active' },
      { label: 'Inactivo', value: 'inactive' },
    ],
  },
]);

useFilterSync(memberFilterValues, (v) =>
  memberStore.applyFilters({
    search: emptyToUndefined(v.search),
    status: v.status || undefined,
    roleId: v.roleId || undefined,
  }),
);

const isInitialLoading = computed(() => memberStore.isLoading && memberStore.members.length === 0);

const memberSorting = useSortingState();
const memberTable = useAppTable<Member>({
  columns: useMemberColumns(),
  // computed, no el array pelado: los stores de Pinia desenvuelven los refs
  // y la tabla solo reacciona a refs/computed (si no, "a veces" no hay filas).
  data: computed(() => memberStore.members),
  manualSorting: true,
  manualPagination: true,
  autoResetPageIndex: false,
  ...useControlledSorting(memberSorting, (sorting) => {
    memberStore.setSort(sortingStateToServer(sorting)).catch(() => {});
  }),
});

const statusLabel = (status?: string): string => {
  if (status === 'inactive') return 'Inactivo';
  if (status === 'pending') return 'Pendiente';
  return 'Activo';
};

const statusVariant = (status?: string): BadgeVariant => {
  if (status === 'inactive') return 'danger';
  if (status === 'pending') return 'warning';
  return 'success';
};

const isSelf = (memberId: string): boolean => authStore.user?.id === memberId;

const isOwnerRole = (role: string): boolean => role === 'Owner' || role === 'owner';

// --- ADD MEMBER ---
const addModal = useModal();
const isAddModalOpen = addModal.isOpen;
const addForm = reactive({
  name: '',
  email: '',
  roleIds: [] as string[],
  phone: '',
  position: '',
  document_type: '',
  document_number: '',
});
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const addEmailError = computed(() =>
  addForm.email && !emailRegex.test(addForm.email) ? 'Correo electrónico inválido' : null
);

onMounted(async () => {
  if (authStore.activeTenantId) {
    await Promise.all([
      memberStore.fetchMembers(),
      roleService.getRoles().then(r => availableRoles.value = r)
    ]);
  }
});

// Acción rápida de la paleta (Ctrl+K → "Invitar miembro").
// Arrow function: openAddModal se declara más abajo y el argumento se
// evaluaría de inmediato (TDZ) si se pasara la referencia directa.
useCreateAction(() => openAddModal());

const { isDirty: isAddDirty, capture: captureAddForm } = useDirtyForm(() => ({
  name: addForm.name,
  email: addForm.email,
  roleIds: [...addForm.roleIds],
  phone: addForm.phone,
  position: addForm.position,
  document_type: addForm.document_type,
  document_number: addForm.document_number,
}));

const openAddModal = () => {
  addForm.name = '';
  addForm.email = '';
  addForm.roleIds = [];
  addForm.phone = '';
  addForm.position = '';
  addForm.document_type = '';
  addForm.document_number = '';
  memberStore.error = null;
  captureAddForm();
  addModal.open();
};

const handleAddSubmit = async () => {
  try {
    const payload = {
      name: addForm.name,
      email: addForm.email,
      roleIds: addForm.roleIds,
      phone: emptyToUndefined(addForm.phone),
      position: emptyToUndefined(addForm.position),
      document_type: emptyToUndefined(addForm.document_type),
      document_number: emptyToUndefined(addForm.document_number),
    };

    const data = await memberStore.addMember(payload);

    // La contraseña temporal ya no se muestra en pantalla: se envía por email.
    addModal.close();
    toast.success(
      data?.isNewUser
        ? `Miembro agregado. Contraseña temporal enviada a ${addForm.email}.`
        : `Miembro existente añadido a la empresa.`,
    );

    addForm.name = '';
    addForm.email = '';
    addForm.roleIds = [];
    addForm.phone = '';
    addForm.position = '';
    addForm.document_type = '';
    addForm.document_number = '';
  } catch {
    // El error queda en memberStore.error y lo muestra el UiAlert del modal.
  }
};

// --- EDIT MEMBER ---
const editModal = useModal();
const isEditModalOpen = editModal.isOpen;
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

// Estado previo a la edición: permite ofrecer "Deshacer" si solo cambió el status.
const prevStatus = ref<'active' | 'inactive'>('active');

const editableContactFields = () => ({
  roleIds: [...editForm.roleIds],
  status: editForm.status,
  phone: editForm.phone,
  position: editForm.position,
  document_type: editForm.document_type,
  document_number: editForm.document_number,
});

const { isDirty: isEditDirty, capture: captureEditForm } = useDirtyForm(editableContactFields);

const openEditModal = (member: any) => {
  if (isSelf(member.id)) {
    toast.error('No puedes modificar tu propio acceso. Pide a otro administrador que lo haga.');
    return;
  }
  editForm.id = member.id;
  editForm.name = member.name;
  editForm.status = member.status || 'active';
  prevStatus.value = member.status || 'active';
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
  captureEditForm();
  editModal.open();
};

const handleEditSubmit = async () => {
  const memberId = editForm.id;
  const newStatus = editForm.status;
  const statusChanged = newStatus !== prevStatus.value;
  try {
    await memberStore.updateMember(memberId, {
      roleIds: editForm.roleIds,
      status: newStatus,
      phone: emptyToUndefined(editForm.phone),
      position: emptyToUndefined(editForm.position),
      document_type: emptyToUndefined(editForm.document_type),
      document_number: emptyToUndefined(editForm.document_number),
    });
    isEditModalOpen.value = false;
    if (statusChanged) {
      // El cambio de estado es reversible: ofrecer deshacerlo sin reabrir el modal.
      const previous = prevStatus.value;
      toast.withAction(
        'success',
        newStatus === 'active' ? 'Miembro activado' : 'Miembro desactivado',
        { label: 'Deshacer', onClick: () => memberStore.updateMember(memberId, { status: previous }).catch(() => {}) },
      );
    } else {
      toast.success('Miembro actualizado correctamente');
    }
  } catch (error) {
    // El error queda en memberStore.error y lo muestra el UiAlert del modal.
  }
};

// --- DELETE MEMBER ---
const deleteModal = useModal<{ id: string; name: string }>();
const isDeleteModalOpen = deleteModal.isOpen;
const deleteTarget = deleteModal.target;

const handleDelete = async (userId: string, userName: string) => {
  if (isSelf(userId)) {
    toast.error('No puedes eliminarte a ti mismo del equipo.');
    return;
  }
  deleteModal.open({ id: userId, name: userName });
  memberStore.error = null;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  try {
    await memberStore.removeMember(deleteTarget.value.id);
    deleteModal.reset();
    toast.success('Miembro removido del equipo');
  } catch (error) {
    // El error queda en memberStore.error y lo muestra el UiConfirmDialog.
  }
};

// --- RESET PASSWORD (siempre envía por correo) ---
const resetModal = useModal<{ id: string; name: string; email: string }>();
const isResetModalOpen = resetModal.isOpen;
const resetTarget = resetModal.target;

const openResetPasswordModal = (member: any) => {
  resetModal.open({ id: member.id, name: member.name, email: member.email });
  memberStore.error = null;
};

const confirmResetPassword = async () => {
  if (!resetTarget.value) return;
  try {
    await memberStore.resetPassword(resetTarget.value.id);
    const email = resetTarget.value.email;
    resetModal.reset();
    toast.success(`Contraseña reseteada y enviada a ${email}`);
  } catch {
    // El error queda en memberStore.error y lo muestra el UiConfirmDialog.
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
