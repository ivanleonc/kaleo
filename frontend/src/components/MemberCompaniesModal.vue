<template>
  <UiModal v-model="isOpen" size="large" :label="`Empresas de ${userName || 'miembro'}`">
    <UiCard>
      <template #header>
        <h3 class="card-title">Empresas de {{ userName }}</h3>
        <p class="card-description">{{ userEmail }}</p>
      </template>

      <UiAlert v-if="memberStore.error" type="error">{{ memberStore.error }}</UiAlert>

      <div v-if="isLoadingCompanies" class="companies-loading" role="status">
        <UiSkeleton variant="block" height="48px" />
        <UiSkeleton variant="block" height="48px" />
      </div>

      <ul v-else-if="companies.length > 0" class="companies-list">
        <li v-for="c in companies" :key="c.id" class="company-row">
          <div class="company-info">
            <strong>{{ c.name }}</strong>
            <span class="company-roles">{{ c.roles.join(', ') || 'Sin rol' }}</span>
          </div>
          <div class="company-actions">
            <UiButton
              v-if="confirmingRemove !== c.id"
              variant="outline"
              size="sm"
              width="auto"
              :disabled="isBusy"
              @click="confirmingRemove = c.id"
            >
              Quitar
            </UiButton>
            <template v-else>
              <UiButton
                variant="danger"
                size="sm"
                width="auto"
                :loading="isBusy"
                @click="confirmDetach(c.id)"
              >
                Confirmar
              </UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                width="auto"
                :disabled="isBusy"
                @click="confirmingRemove = null"
              >
                Cancelar
              </UiButton>
            </template>
          </div>
        </li>
      </ul>

      <UiEmptyState
        v-else
        title="Sin empresas"
        description="Este miembro aún no pertenece a ninguna empresa."
      />

      <!-- Agregar a otra empresa -->
      <div v-if="addableCompanies.length > 0" class="company-add">
        <p class="company-add-title">Agregar a otra empresa</p>
        <div class="form-row">
          <UiSelect
            v-model="addCompanyId"
            label="Empresa"
            :options="addableCompanies.map((c) => ({ label: c.name, value: c.id }))"
          />
          <UiSelect
            v-model="addRoleName"
            label="Rol"
            :options="addRoleOptions"
            :disabled="!addCompanyId || isLoadingRoles"
          />
        </div>
        <UiButton
          variant="outline"
          width="auto"
          :loading="isBusy"
          :disabled="!addCompanyId || !addRoleName"
          @click="confirmAttach"
        >
          Agregar a la empresa
        </UiButton>
      </div>
      <p v-else class="company-add-empty">
        Ya pertenece a todas las empresas que puedes administrar.
      </p>

      <template #footer>
        <div class="modal-footer">
          <UiButton variant="outline" @click="close">Cerrar</UiButton>
        </div>
      </template>
    </UiCard>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import UiModal from '@/components/ui/UiModal.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import { useMemberStore } from '@/stores/member.store';
import { useCompanyStore } from '@/stores/company.store';
import { useAuthStore } from '@/stores/auth.store';
import { roleService, type Role } from '@/services/role.service';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';

const props = defineProps<{
  userId: string | null;
  userName?: string;
  userEmail?: string;
}>();

const isOpen = defineModel<boolean>({ default: false });

const memberStore = useMemberStore();
const companyStore = useCompanyStore();
const authStore = useAuthStore();
const toast = useToast();

const companies = computed(() => memberStore.memberCompanies);
const isLoadingCompanies = ref(false);
const isBusy = ref(false);
const confirmingRemove = ref<string | null>(null);

const addCompanyId = ref('');
const addRoleName = ref('');
const addCompanyRoles = ref<Role[]>([]);
const isLoadingRoles = ref(false);

/** Empresas administrables aún no asignadas a este miembro. */
const addableCompanies = computed(() => {
  const mine = (authStore.user?.tenants ?? [])
    .filter((t) => (t.roles ?? []).some((r) => r === 'Owner' || r === 'Admin'))
    .map((t) => ({ id: t.id, name: t.name }));
  const pool = authStore.isSuperAdmin
    ? (() => {
        const seen = new Set(mine.map((m) => m.id));
        return [
          ...mine,
          ...companyStore.allCompanies
            .filter((c) => !seen.has(c.id))
            .map((c) => ({ id: c.id, name: c.name })),
        ];
      })()
    : mine;
  const assigned = new Set(companies.value.map((c) => c.id));
  return pool.filter((c) => !assigned.has(c.id));
});

const addRoleOptions = computed(() =>
  addCompanyRoles.value.map((r) => ({ label: r.name, value: r.name })),
);

async function loadCompanies() {
  if (!props.userId) return;
  isLoadingCompanies.value = true;
  confirmingRemove.value = null;
  addCompanyId.value = '';
  addRoleName.value = '';
  addCompanyRoles.value = [];
  try {
    await memberStore.fetchUserCompanies(props.userId);
  } finally {
    isLoadingCompanies.value = false;
  }
}

watch(
  isOpen,
  (open) => {
    if (open) {
      memberStore.error = null;
      if (authStore.isSuperAdmin) {
        companyStore.fetchAllCompanies().catch(() => {});
      }
      loadCompanies().catch(() => {});
    }
  },
  { immediate: true },
);

watch(addCompanyId, async (cid) => {
  addRoleName.value = '';
  addCompanyRoles.value = [];
  if (!cid) return;
  isLoadingRoles.value = true;
  try {
    addCompanyRoles.value = await roleService.getRoles(cid);
    const first = addCompanyRoles.value[0];
    if (first) {
      addRoleName.value = first.name;
    }
  } catch {
    addCompanyRoles.value = [];
  } finally {
    isLoadingRoles.value = false;
  }
});

async function confirmAttach() {
  if (!props.userId || !addCompanyId.value || !addRoleName.value) return;
  isBusy.value = true;
  try {
    await memberStore.attachMemberToCompany(addCompanyId.value, {
      userId: props.userId,
      roleNames: [addRoleName.value],
    });
    toast.success('Miembro asignado a la empresa.');
    addCompanyId.value = '';
    addRoleName.value = '';
    await loadCompanies();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No se pudo asignar la empresa.'));
  } finally {
    isBusy.value = false;
  }
}

async function confirmDetach(companyId: string) {
  if (!props.userId) return;
  isBusy.value = true;
  try {
    await memberStore.detachMemberFromCompany(companyId, props.userId);
    toast.success('Empresa desvinculada del miembro.');
    confirmingRemove.value = null;
    await loadCompanies();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No se pudo quitar la empresa.'));
  } finally {
    isBusy.value = false;
  }
}

function close() {
  isOpen.value = false;
}
</script>

<style scoped>
.card-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}
.card-description {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.companies-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.companies-list {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.company-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
}
.company-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--text-sm);
}
.company-roles {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.company-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
.company-add {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}
.company-add-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}
.company-add-empty {
  margin: var(--space-3) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .company-row {
    flex-direction: column;
    align-items: stretch;
  }
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
