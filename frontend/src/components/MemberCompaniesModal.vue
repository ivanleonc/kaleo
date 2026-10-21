<template>
  <UiModal
    v-model="isOpen"
    size="large"
    :label="`Empresas de ${displayName}`"
    :labelledby="titleId"
    :describedby="descriptionId"
  >
    <template #header>
      <div class="member-modal-heading">
        <span class="member-modal-icon" aria-hidden="true">
          <IconBuilding :size="20" stroke-width="1.8" />
        </span>
        <div class="member-modal-copy">
          <h2 :id="titleId" class="member-modal-title">Empresas de {{ displayName }}</h2>
          <p :id="descriptionId" class="member-modal-description">
            {{ userEmail || 'Gestiona las empresas a las que pertenece este miembro.' }}
          </p>
        </div>
      </div>
    </template>

    <UiAlert v-if="memberStore.error" type="error">{{ memberStore.error }}</UiAlert>

    <UiFormSection
      title="Empresas asignadas"
      description="Puedes quitar el acceso a cualquier empresa sin eliminar la cuenta."
    >
      <div v-if="isLoadingCompanies" class="companies-loading" role="status">
        <span class="sr-only">Cargando empresas…</span>
        <UiSkeleton variant="block" height="52px" />
        <UiSkeleton variant="block" height="52px" />
      </div>

      <ul v-else-if="companies.length > 0" class="companies-list">
        <li v-for="c in companies" :key="c.id" class="company-row">
          <div class="company-info">
            <strong class="company-name">{{ c.name }}</strong>
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

      <div v-else class="company-empty">
        <p class="company-empty-title">Sin empresas</p>
        <p class="company-empty-text">Este miembro aún no pertenece a ninguna empresa.</p>
      </div>
    </UiFormSection>

    <UiFormSection
      v-if="addableCompanies.length > 0"
      title="Agregar a otra empresa"
      description="Selecciona la empresa y el rol que tendrá el miembro en ella."
    >
      <div class="company-add">
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
    </UiFormSection>

    <p v-else class="company-add-empty">
      Ya pertenece a todas las empresas que puedes administrar.
    </p>

    <template #footer>
      <UiButton variant="outline" width="auto" @click="close">Cerrar</UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, useId } from 'vue';
import { IconBuilding } from '@tabler/icons-vue';
import UiModal from '@/components/ui/UiModal.vue';
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
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

const titleId = `member-companies-title-${useId()}`;
const descriptionId = `member-companies-description-${useId()}`;

const displayName = computed(() => props.userName || 'miembro');

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
.member-modal-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.member-modal-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-hover);
  color: var(--text-muted);
}

.member-modal-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.member-modal-title {
  font-size: var(--text-xl);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.member-modal-description {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-muted);
}

.companies-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.companies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.company-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-card);
}

.company-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--text-sm);
}

.company-name {
  color: var(--text-main);
}

.company-roles {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.company-actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

.company-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.company-empty-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.company-empty-text {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.company-add {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: flex-start;
}

.company-add-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  width: 100%;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .company-row {
    flex-direction: column;
    align-items: stretch;
  }

  .company-actions {
    justify-content: flex-end;
  }
}
</style>
