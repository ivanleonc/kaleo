<template>
  <AuthenticatedLayout>
    <div class="branches-container">
      <UiPageHeader
        title="Sedes"
        subtitle="Gestiona las ubicaciones de tu empresa."
      >
        <template #actions>
          <UiButton v-permission="Permissions.BRANCHES.CREATE" @click="openCreateModal" width="auto">
            <IconPlus :size="16" /> Nueva Sede
          </UiButton>
        </template>
      </UiPageHeader>

      <UiTableFilters v-model="branchFilterValues" :filters="branchFilterDefs" />

      <div class="table-section">
        <BranchTable
          :table="branchTable"
          :loading="isInitialLoading"
          :error="branchStore.error"
          error-title="No pudimos cargar las sedes"
          :empty-title="branchStore.branches.length === 0 ? 'No hay sedes todavía' : 'Sin resultados'"
          :empty-description="branchStore.branches.length === 0
            ? 'Agrega tu primera ubicación para empezar.'
            : 'Prueba con otra búsqueda o limpia los filtros.'"
          @retry="branchStore.fetchBranches()"
          @edit="openEditModal"
          @delete="openDeleteModal"
          @toggle-active="handleToggleActive"
        >
          <template #empty-action>
            <UiButton
              v-if="branchStore.branches.length === 0"
              v-permission="Permissions.BRANCHES.CREATE"
              width="auto"
              @click="openCreateModal"
            >
              <IconPlus :size="16" /> Nueva Sede
            </UiButton>
          </template>
        </BranchTable>
      </div>

      <!-- Pagination -->
      <UiPagination
        :page="branchStore.page"
        :total="branchStore.total"
        :limit="branchStore.limit"
        show-page-size
        @update:page="branchStore.goToPage"
        @update:limit="branchStore.setLimit"
      />

      <!-- Create/Edit Modal -->
      <UiFormModal
        v-model="isFormModalOpen"
        :title="editingBranch ? 'Editar Sede' : 'Nueva Sede'"
        :description="editingBranch ? `Modificando: ${editingBranch.name}` : 'Agrega una nueva ubicación a tu empresa.'"
        :confirm-on-dirty="true"
        :dirty="isFormDirty"
        @submit="handleSubmit"
      >
        <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>

        <div class="form-row">
          <UiInput v-model="form.name" label="Nombre de la Sede" required />
          <UiInput v-model="form.code" label="Código (Opcional)" placeholder="BOG-01" />
        </div>
        <UiInput v-model="form.address" label="Dirección" />
        <div class="form-row">
          <UiInput v-model="form.city" label="Ciudad" />
          <UiInput v-model="form.state" label="Estado / Provincia" />
        </div>
        <div class="form-row">
          <UiInput v-model="form.country" label="País" />
          <UiInput v-model="form.postal_code" label="Código Postal" />
        </div>
        <div class="form-row">
          <UiInput v-model="form.phone" label="Teléfono" type="tel" />
          <UiInput
            v-model="form.email"
            label="Email"
            type="email"
            :error="branchEmailError"
            @blur="emailTouched = true"
          />
        </div>
        <div class="form-row">
          <UiSelect v-model="form.manager_user_id" label="Responsable" :options="managerOptions" />
          <UiTimezoneSelect v-model="form.timezone" />
        </div>
        <UiSelect
          v-model="form.is_main_flag"
          label="Sede principal"
          :options="mainOptions"
        />

        <template #footer="{ requestClose }">
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="requestClose">
              Cancelar
            </UiButton>
            <UiButton type="submit" :loading="branchStore.isLoading">
              {{ editingBranch ? 'Guardar Cambios' : 'Crear Sede' }}
            </UiButton>
          </div>
        </template>
      </UiFormModal>
    </div>

    <!-- Delete Confirmation Modal -->
    <UiConfirmDialog
      v-model="isDeleteModalOpen"
      title="Eliminar Sede"
      :loading="branchStore.isLoading"
      :error="branchStore.error"
      confirm-label="Eliminar"
      @confirm="confirmDelete"
    >
      ¿Estás seguro de que deseas eliminar la sede <strong>{{ deletingBranch?.name }}</strong>?
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useBranchStore } from '@/stores/branch.store';
import { useMemberStore } from '@/stores/member.store';
import { useAuthStore } from '@/stores/auth.store';
import { Permissions } from '@/constants/permissions';
import type { Branch } from '@/types/branch';
import { useModal } from '@/composables/useModal';
import { useBranchColumns } from '@/composables/useBranchColumns';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiTableFilters, { type TableFilterDef } from '@/components/ui/UiTableFilters.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiTimezoneSelect from '@/components/ui/UiTimezoneSelect.vue';
import BranchTable from '@/components/features/branches/BranchTable.vue';
import { useToast } from '@/composables/useToast';
import { useCreateAction } from '@/composables/useCreateAction';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useFilterSync } from '@/composables/useFilterSync';
import { useCompanyPath } from '@/composables/useCompanyPath';
import {
  useAppTable,
  useSortingState,
  useControlledSorting,
  sortingStateToServer,
} from '@/composables/useAppTable';
import { emptyToUndefined } from '@/utils/text';
import { apiErrorMessage } from '@/utils/error';
import {
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconBuildingCommunity,
  IconSwitchHorizontal,
} from '@tabler/icons-vue';

const branchStore = useBranchStore();
const memberStore = useMemberStore();
const authStore = useAuthStore();
const toast = useToast();
const { companyId } = useCompanyPath();

// --- FILTERS ---
// El filtrado ocurre en el servidor para que page/total sigan siendo
// coherentes. Un solo watcher profundo (useFilterSync) cubre todas las claves.
const branchFilterValues = ref({ search: '', status: '' });

watch(companyId, (newId, oldId) => {
  if (newId !== oldId && newId) {
    branchFilterValues.value = { search: '', status: '' };
    // El dropdown de "Responsable" se alimenta de memberStore.members: al
    // cambiar de empresa hay que recargarlo (el store resetea solo, pero
    // onMounted no vuelve a correr porque la vista ya está montada).
    memberStore.fetchMembers().catch(() => {});
  }
});

const branchFilterDefs: TableFilterDef[] = [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar sedes',
    placeholder: 'Buscar por nombre o ciudad...',
    grow: true,
  },
  {
    key: 'status',
    type: 'select',
    label: 'Filtrar por estado',
    options: [
      { label: 'Todos los estados', value: '' },
      { label: 'Activa', value: 'active' },
      { label: 'Inactiva', value: 'inactive' },
    ],
  },
];

useFilterSync(branchFilterValues, (v) =>
  branchStore.applyFilters({
    search: emptyToUndefined(v.search),
    status: v.status || undefined,
  }),
);

const isInitialLoading = computed(() => branchStore.isLoading && branchStore.branches.length === 0);

const branchSorting = useSortingState();
const branchTable = useAppTable<Branch>({
  columns: useBranchColumns(),
  // computed, no el array pelado: los stores de Pinia desenvuelven los refs
  // y la tabla solo reacciona a refs/computed (si no, "a veces" no hay filas).
  data: computed(() => branchStore.branches),
  manualSorting: true,
  manualPagination: true,
  autoResetPageIndex: false,
  ...useControlledSorting(branchSorting, (sorting) => {
    branchStore.setSort(sortingStateToServer(sorting)).catch(() => {});
  }),
});

const handleToggleActive = async (branch: Branch) => {
  const wasActive = branch.is_active;
  try {
    await branchStore.updateBranch(branch.id, { is_active: !wasActive });
    // El toggle es reversible, así que el aviso ofrece deshacerlo sin abrir la fila.
    toast.withAction(
      'success',
      wasActive ? 'Sede desactivada' : 'Sede activada',
      { label: 'Deshacer', onClick: () => handleToggleActive({ ...branch, is_active: wasActive }) },
    );
  } catch (err: any) {
    toast.error(apiErrorMessage(err, 'Error al cambiar el estado'));
  }
};

// --- CREATE / EDIT ---
const formModal = useModal<Branch>();
const isFormModalOpen = formModal.isOpen;
const editingBranch = ref<Branch | null>(null);
const formError = ref('');

const form = reactive({
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  phone: '',
  email: '',
  code: '',
  manager_user_id: '',
  timezone: '',
  is_main_flag: 'no',
});

const mainOptions = [
  { label: 'No', value: 'no' },
  { label: 'Sí, es la sede principal', value: 'yes' },
];

const emailTouched = ref(false);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const branchEmailError = computed(() =>
  emailTouched.value && form.email && !emailRegex.test(form.email)
    ? 'Correo electrónico inválido.'
    : null
);

const managerOptions = computed(() => [
  { label: 'Sin responsable', value: '' },
  ...memberStore.members.map((m: any) => ({
    label: `${m.name} (${m.email})`,
    value: m.id,
  })),
]);

const { isDirty: isFormDirty, capture: snapshotForm } = useDirtyForm(() => ({ ...form }));

const resetForm = () => {
  form.name = ''; form.address = ''; form.city = ''; form.state = '';
  form.country = ''; form.postal_code = ''; form.phone = ''; form.email = '';
  form.code = ''; form.manager_user_id = ''; form.timezone = '';
  form.is_main_flag = 'no';
};

const openCreateModal = () => {
  editingBranch.value = null;
  resetForm();
  emailTouched.value = false;
  formError.value = '';
  snapshotForm();
  isFormModalOpen.value = true;
};

const openEditModal = (branch: Branch) => {
  editingBranch.value = branch;
  form.name = branch.name;
  form.address = branch.address || '';
  form.city = branch.city || '';
  form.state = branch.state || '';
  form.country = branch.country || '';
  form.postal_code = branch.postal_code || '';
  form.phone = branch.phone || '';
  form.email = branch.email || '';
  form.code = branch.code || '';
  form.manager_user_id = branch.manager_user_id || '';
  form.timezone = branch.timezone || '';
  form.is_main_flag = branch.is_main ? 'yes' : 'no';
  emailTouched.value = false;
  formError.value = '';
  snapshotForm();
  isFormModalOpen.value = true;
};

const handleSubmit = async () => {
  formError.value = '';
  try {
    if (editingBranch.value) {
      await branchStore.updateBranch(editingBranch.value.id, {
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        postal_code: form.postal_code,
        phone: form.phone,
        email: form.email,
        code: emptyToUndefined(form.code),
        manager_user_id: emptyToUndefined(form.manager_user_id),
        timezone: emptyToUndefined(form.timezone),
        is_main: form.is_main_flag === 'yes',
      });
      toast.success('Sede actualizada correctamente');
    } else {
      await branchStore.createBranch({
        name: form.name,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        postal_code: form.postal_code || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        code: emptyToUndefined(form.code),
        manager_user_id: emptyToUndefined(form.manager_user_id),
        timezone: emptyToUndefined(form.timezone),
      });
      toast.success('Sede creada correctamente');
    }
    isFormModalOpen.value = false;
  } catch (err: any) {
    formError.value = apiErrorMessage(err, 'Error al guardar la sede');
  }
};

// --- DELETE ---
const deleteModal = useModal<Branch>();
const isDeleteModalOpen = deleteModal.isOpen;
const deletingBranch = deleteModal.target;

const openDeleteModal = (branch: Branch) => {
  branchStore.error = null;
  deleteModal.open(branch);
};

const confirmDelete = async () => {
  if (!deletingBranch.value) return;
  try {
    await branchStore.deleteBranch(deletingBranch.value.id);
    deleteModal.reset();
    toast.success('Sede eliminada correctamente');
  } catch {
    // El error queda en branchStore.error y lo muestra el UiConfirmDialog.
  }
};

onMounted(() => {
  branchStore.fetchBranches();
  if (authStore.activeTenantId && memberStore.members.length === 0) {
    memberStore.fetchMembers().catch(() => {});
  }
});

// Acción rápida de la paleta (Ctrl+K → "Nueva sede").
useCreateAction(() => openCreateModal());
</script>

<style scoped>
.branches-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.branch-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background-color: var(--accent-blue-bg);
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.branch-main-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-amber);
}
</style>
