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

      <div class="filters-bar">
        <div class="filter-group filter-group-grow">
          <UiSearchInput v-model="searchQuery" placeholder="Buscar por nombre o ciudad..." />
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
          :columns="branchColumns"
          :rows="filteredBranches"
          :loading="isInitialLoading"
          :empty-title="branchStore.branches.length === 0 ? 'No hay sedes todavía' : 'Sin resultados'"
          :empty-description="branchStore.branches.length === 0
            ? 'Agrega tu primera ubicación para empezar.'
            : 'Prueba con otra búsqueda o limpia los filtros.'"
        >
          <template #cell-name="{ row }">
            <div class="user-cell">
              <div class="branch-avatar">
                <IconBuildingCommunity :size="16" stroke-width="1.8" />
              </div>
              <div class="user-cell-text">
                <span class="font-medium truncate" :title="row.name">
                  {{ row.name }}
                  <span v-if="row.code" class="text-muted">· {{ row.code }}</span>
                </span>
                <span v-if="row.is_main" class="branch-main-tag">Principal</span>
              </div>
            </div>
          </template>
          <template #cell-location="{ row }">
            <span v-if="row.city || row.state || row.country">
              {{ [row.city, row.state, row.country].filter(Boolean).join(', ') }}
            </span>
            <span v-else class="text-muted">Sin ubicación</span>
          </template>
          <template #cell-contact="{ row }">
            <div class="user-cell-text">
              <span v-if="row.phone || row.email">
                {{ row.phone || row.email }}
              </span>
              <span v-else class="text-muted">Sin contacto</span>
              <span v-if="row.manager_name" class="user-cell-sub truncate" :title="row.manager_name">
                Resp: {{ row.manager_name }}
              </span>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge size="sm" :variant="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? 'Activa' : 'Inactiva' }}
            </UiBadge>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions" v-permission="Permissions.BRANCHES.UPDATE">
              <UiDropdown align="end" label="Acciones de la sede">
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
                  <UiDropdownItem @click="handleToggleActive(row)">
                    <IconSwitchHorizontal :size="14" stroke-width="1.8" />
                    <span>{{ row.is_active ? 'Desactivar' : 'Activar' }}</span>
                  </UiDropdownItem>
                  <div class="ui-dropdown-divider" role="separator"></div>
                  <UiDropdownItem danger @click="openDeleteModal(row)" v-permission="Permissions.BRANCHES.DELETE">
                    <IconTrash :size="14" stroke-width="1.8" />
                    <span>Eliminar</span>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </template>
          <template #empty-icon>
            <IconBuildingCommunity :size="48" stroke-width="1.5" />
          </template>
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
        </UiDataTable>
      </div>

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
          <UiInput v-model="form.phone" label="Teléfono" />
          <UiInput v-model="form.email" label="Email" type="email" />
        </div>
        <div class="form-row">
          <UiSelect v-model="form.manager_user_id" label="Responsable" :options="managerOptions" />
          <UiInput v-model="form.timezone" label="Zona Horaria" placeholder="America/Bogota" />
        </div>
        <UiSelect
          v-if="editingBranch"
          v-model="form.is_main_flag"
          label="Sede principal"
          :options="mainOptions"
        />

        <template #footer>
          <div class="modal-footer">
            <UiButton type="button" variant="outline" @click="isFormModalOpen = false">
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
import { ref, reactive, onMounted, computed } from 'vue';
import { useBranchStore } from '@/stores/branch.store';
import { useMemberStore } from '@/stores/member.store';
import { useAuthStore } from '@/stores/auth.store';
import { Permissions } from '@/constants/permissions';
import type { Branch } from '@/types/branch';

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { emptyToUndefined } from '@/utils/text';
import { apiErrorMessage } from '@/utils/error';
import {
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconBuildingCommunity,
  IconSwitchHorizontal,
  IconX,
} from '@tabler/icons-vue';

const branchStore = useBranchStore();
const memberStore = useMemberStore();
const authStore = useAuthStore();
const toast = useToast();

// --- FILTERS ---
const searchQuery = ref('');
const filterStatus = ref('');

const statusFilterOptions = [
  { label: 'Todos los estados', value: '' },
  { label: 'Activa', value: 'active' },
  { label: 'Inactiva', value: 'inactive' },
];

const hasActiveFilters = computed(() => searchQuery.value || filterStatus.value);

const filteredBranches = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return branchStore.branches.filter((b) => {
    const status = b.is_active ? 'active' : 'inactive';
    if (filterStatus.value && status !== filterStatus.value) return false;
    if (query) {
      const haystack = `${b.name || ''} ${b.city || ''} ${b.state || ''} ${b.country || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
});

const clearFilters = () => {
  searchQuery.value = '';
  filterStatus.value = '';
};

const isInitialLoading = computed(() => branchStore.isLoading && branchStore.branches.length === 0);

const branchColumns = [
  { key: 'name', label: 'Nombre' },
  { key: 'location', label: 'Ubicación' },
  { key: 'contact', label: 'Contacto' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: '', align: 'right' as const },
];

const handleToggleActive = async (branch: Branch) => {
  try {
    await branchStore.updateBranch(branch.id, { is_active: !branch.is_active });
    toast.success(branch.is_active ? 'Sede desactivada' : 'Sede activada');
  } catch (err: any) {
    toast.error(apiErrorMessage(err, 'Error al cambiar el estado'));
  }
};

const openDeleteModal = (branch: Branch) => {
  deletingBranch.value = branch;
  isDeleteModalOpen.value = true;
};

// --- CREATE / EDIT ---
const isFormModalOpen = ref(false);
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
const isDeleteModalOpen = ref(false);
const deletingBranch = ref<Branch | null>(null);

const confirmDelete = async () => {
  if (!deletingBranch.value) return;
  try {
    await branchStore.deleteBranch(deletingBranch.value.id);
    isDeleteModalOpen.value = false;
    deletingBranch.value = null;
    toast.success('Sede eliminada correctamente');
  } catch (err: any) {
    toast.error(apiErrorMessage(err, 'Error al eliminar la sede'));
  }
};

onMounted(() => {
  branchStore.fetchBranches();
  if (authStore.activeTenantId && memberStore.members.length === 0) {
    memberStore.fetchMembers().catch(() => {});
  }
});
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
  background-color: var(--accent-blue-bg, rgba(59, 130, 246, 0.1));
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
  color: var(--accent-amber, #eab308);
}
</style>
