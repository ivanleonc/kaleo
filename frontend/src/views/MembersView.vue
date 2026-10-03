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
                  <UiDropdownItem @click="openCompaniesModal(row)" v-permission="Permissions.USERS.UPDATE">
                    <IconBuildingCommunity :size="14" stroke-width="1.8" />
                    <span>Gestionar empresas</span>
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

        <!-- Buscar usuario existente: si se elige uno, solo se vincula (sin
             tocar su contraseña). Si no, se crea con temporal por correo. -->
        <div class="assign-search">
          <UiSearchInput
            v-model="userSearchQuery"
            placeholder="¿Ya existe? Busca por nombre o email..."
            @input="onUserSearchInput"
          />
          <ul v-if="userSearchResults.length > 0 && !selectedUser" class="user-results" role="listbox" aria-label="Usuarios encontrados">
            <li v-for="u in userSearchResults" :key="u.id" role="option">
              <button type="button" class="user-result" @click="pickExistingUser(u)">
                <span class="user-result-name">{{ u.name }}</span>
                <span class="user-result-email">{{ u.email }}</span>
              </button>
            </li>
          </ul>
          <p v-if="isSearching" class="assign-hint" role="status">Buscando…</p>
          <p v-if="selectedUser" class="assign-picked">
            Usuario existente: <strong>{{ selectedUser.name }} ({{ selectedUser.email }})</strong>
            <button type="button" class="link-btn" @click="clearSelectedUser">Quitar</button>
          </p>
        </div>

        <!-- Asignación multi-empresa (solo si administra más de una). -->
        <div v-if="assignableCompanies.length > 1" class="assign-companies">
          <p class="assign-label" id="assign-companies-label">Empresas donde asignar</p>
          <div class="assign-checks" role="group" aria-labelledby="assign-companies-label">
            <label v-for="c in assignableCompanies" :key="c.id" class="assign-check">
              <input type="checkbox" :value="c.id" v-model="assignCompanyIds" />
              <span>{{ c.name }}</span>
              <span v-if="c.id === companyId" class="assign-current">(actual)</span>
            </label>
          </div>
        </div>

        <UiSelect
          v-if="isMultiAssign"
          v-model="assignRoleName"
          label="Rol (se aplica en todas las empresas elegidas)"
          :options="assignRoleOptions"
        />
        <div class="form-row">
          <UiInput v-model="addForm.phone" label="Teléfono (Opcional)" type="text" autocomplete="tel" />
          <UiInput v-model="addForm.position" label="Cargo (Opcional)" type="text" />
        </div>
        <div class="form-row">
          <UiInput v-model="addForm.document_type" label="Tipo Doc. (Opcional)" type="text" placeholder="CC" />
          <UiInput v-model="addForm.document_number" label="Núm. Documento (Opcional)" type="text" />
        </div>
        <UiDualListbox
          v-if="!isMultiAssign"
          v-model="addForm.roleIds"
          :available="roleItems"
          :selected="roleItems"
          label="Roles"
          available-label="Disponibles"
          selected-label="Asignados"
        />
        <div v-if="attachResults.length > 0" class="attach-results" role="status">
          <p
            v-for="r in attachResults"
            :key="r.companyId"
            :class="r.ok ? 'attach-ok' : 'attach-fail'"
          >
            {{ r.ok ? '✓' : '✗' }} {{ r.companyName }}: {{ r.message }}
          </p>
        </div>
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

    <!-- Empresas del miembro (asignar / quitar multi-empresa) -->
    <MemberCompaniesModal
      v-model="isCompaniesModalOpen"
      :user-id="companiesTarget?.id ?? null"
      :user-name="companiesTarget?.name"
      :user-email="companiesTarget?.email"
    />

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
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
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
import { apiErrorMessage } from '@/utils/error';
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
import type { UserSearchResult } from '@/types/member';
import type { BadgeVariant } from '@/types/ui';
import { useToast } from '@/composables/useToast';
import { useCreateAction } from '@/composables/useCreateAction';
import { useDebounceFn } from '@/composables/useDebounceFn';
import { useCompanyStore } from '@/stores/company.store';
import { IconCrown, IconPlus, IconDotsVertical, IconPencil, IconTrash, IconKey, IconUsers, IconBuildingCommunity } from '@tabler/icons-vue';
import MemberCompaniesModal from '@/components/MemberCompaniesModal.vue';

const authStore = useAuthStore();
const memberStore = useMemberStore();
const companyStore = useCompanyStore();
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

// --- ASIGNACIÓN MULTI-EMPRESA (Owner de varias / super-admin) ---
// El flujo legacy (una empresa = la activa) sigue intacto abajo. Este bloque
// solo se activa cuando hay >1 empresa administrable o se elige un usuario
// existente: entonces se asigna por nombre de rol en cada empresa destino.
const userSearchQuery = ref('');
const userSearchResults = ref<UserSearchResult[]>([]);
const isSearching = ref(false);
const selectedUser = ref<UserSearchResult | null>(null);
const assignCompanyIds = ref<string[]>([]);
const assignRoleName = ref('');
const companyRolesCache = ref<Record<string, Role[]>>({});
const attachResults = ref<Array<{ companyId: string; companyName: string; ok: boolean; message: string }>>([]);

/** Empresas donde puedo asignar: Owner/Admin en mis tenants + todas si super-admin. */
const assignableCompanies = computed(() => {
  const mine = (authStore.user?.tenants ?? [])
    .filter((t) => (t.roles ?? []).some((r) => r === 'Owner' || r === 'Admin'))
    .map((t) => ({ id: t.id, name: t.name }));
  if (!authStore.isSuperAdmin) return mine;
  const seen = new Set(mine.map((m) => m.id));
  const extra = companyStore.allCompanies
    .filter((c) => !seen.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));
  return [...mine, ...extra];
});

const isMultiAssign = computed(() => assignCompanyIds.value.length > 1);

/** Nombres de rol disponibles en las empresas elegidas (unión ordenada). */
const assignRoleOptions = computed(() => {
  const names = new Set<string>();
  for (const cid of assignCompanyIds.value) {
    for (const r of companyRolesCache.value[cid] ?? []) names.add(r.name);
  }
  return [...names].sort().map((n) => ({ label: n, value: n }));
});

async function ensureCompanyRoles(cid: string) {
  if (companyRolesCache.value[cid]) return;
  try {
    companyRolesCache.value[cid] = await roleService.getRoles(cid);
  } catch {
    companyRolesCache.value[cid] = [];
  }
}

watch(assignCompanyIds, async (ids) => {
  for (const id of ids) await ensureCompanyRoles(id);
  const options = assignRoleOptions.value;
  if (assignRoleName.value && !options.some((o) => o.value === assignRoleName.value)) {
    assignRoleName.value = '';
  }
  if (!assignRoleName.value && options.length > 0) {
    assignRoleName.value = (options[0]?.value as string) ?? '';
  }
});

const runUserSearch = async () => {
  const q = userSearchQuery.value.trim();
  if (q.length < 2 || selectedUser.value) {
    if (q.length < 2) userSearchResults.value = [];
    return;
  }
  isSearching.value = true;
  try {
    userSearchResults.value = await memberStore.searchUsers(q);
  } catch {
    userSearchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};
const debouncedUserSearch = useDebounceFn(runUserSearch, 350);
const onUserSearchInput = () => {
  debouncedUserSearch();
};

function pickExistingUser(u: UserSearchResult) {
  selectedUser.value = u;
  addForm.name = u.name;
  addForm.email = u.email;
  userSearchResults.value = [];
}

function clearSelectedUser() {
  selectedUser.value = null;
}

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
  userSearchQuery.value = '';
  userSearchResults.value = [];
  selectedUser.value = null;
  assignRoleName.value = '';
  attachResults.value = [];
  assignCompanyIds.value = companyId.value ? [companyId.value] : [];
  if (authStore.isSuperAdmin) {
    companyStore.fetchAllCompanies().catch(() => {});
  }
  if (companyId.value) {
    ensureCompanyRoles(companyId.value).catch(() => {});
  }
  memberStore.error = null;
  captureAddForm();
  addModal.open();
};

const handleAddSubmit = async () => {
  const targets = assignCompanyIds.value.length > 0
    ? [...assignCompanyIds.value]
    : (companyId.value ? [companyId.value] : []);
  const useLegacy =
    !selectedUser.value && targets.length === 1 && targets[0] === companyId.value;

  // Flujo original intacto: una empresa (la activa), usuario nuevo por email.
  if (useLegacy) {
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
    return;
  }

  // Flujo multi-empresa / usuario existente: un attach por empresa con el
  // mismo rol (resuelto por nombre en cada destino). Se reporta por empresa.
  if (!assignRoleName.value) {
    memberStore.error = 'Elige un rol para asignar en las empresas elegidas.';
    return;
  }
  if (!addForm.email.trim() && !selectedUser.value) {
    memberStore.error = 'Indica el correo del miembro o elige un usuario existente.';
    return;
  }
  memberStore.error = null;
  attachResults.value = [];
  let okCount = 0;
  for (const cid of targets) {
    const cname = assignableCompanies.value.find((c) => c.id === cid)?.name ?? cid;
    try {
      await memberStore.attachMemberToCompany(cid, {
        userId: selectedUser.value?.id,
        email: addForm.email.trim() || undefined,
        name: addForm.name.trim() || undefined,
        roleNames: [assignRoleName.value],
        phone: emptyToUndefined(addForm.phone),
        position: emptyToUndefined(addForm.position),
      });
      okCount++;
      attachResults.value.push({ companyId: cid, companyName: cname, ok: true, message: 'Asignado correctamente' });
    } catch (err) {
      attachResults.value.push({ companyId: cid, companyName: cname, ok: false, message: apiErrorMessage(err, 'Error al asignar') });
    }
  }
  if (okCount === targets.length) {
    toast.success(
      okCount === 1 ? 'Miembro asignado a la empresa.' : `Miembro asignado a ${okCount} empresas.`,
    );
  } else if (okCount > 0) {
    toast.warning(`Asignado en ${okCount} de ${targets.length} empresas. Revisa los errores.`);
  } else {
    toast.error('No se pudo asignar en ninguna empresa.');
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

// --- EMPRESAS DEL MIEMBRO (detalle multi-empresa) ---
const companiesModal = useModal<{ id: string; name: string; email: string }>();
const isCompaniesModalOpen = companiesModal.isOpen;
const companiesTarget = companiesModal.target;

const openCompaniesModal = (member: any) => {
  companiesModal.open({ id: member.id, name: member.name, email: member.email });
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

/* Asignación multi-empresa (modal Invitar) */
.assign-search {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.user-results {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.user-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  text-align: left;
  color: var(--text-main);
}
.user-results li:last-child .user-result {
  border-bottom: none;
}
.user-result:hover {
  background-color: var(--bg-hover);
}
.user-result-name {
  font-weight: 600;
  font-size: var(--text-sm);
}
.user-result-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.assign-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.assign-picked {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-danger, #e5484d);
  font-size: var(--text-sm);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.assign-companies {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.assign-label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.assign-checks {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2);
}

.assign-check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-main);
  cursor: pointer;
  padding: var(--space-1) 0;
}
.assign-check input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}

.assign-current {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.attach-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
}
.attach-results p {
  margin: 0;
  font-size: var(--text-sm);
}
.attach-ok {
  color: var(--color-success, #30a46c);
}
.attach-fail {
  color: var(--color-danger, #e5484d);
}



</style>
