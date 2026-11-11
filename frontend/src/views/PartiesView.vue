<template>
  <AuthenticatedLayout>
    <div class="parties-container">
      <UiPageHeader
        title="Terceros"
        subtitle="Personas y organizaciones que participan en tus proyectos, compras y documentos."
      >
        <template #actions>
          <UiButton
            v-if="!entitlementsStore.isReadOnly"
            v-permission="Permissions.PARTIES.CREATE"
            width="auto"
            @click="openCreate"
          >
            <IconPlus :size="16" /> Nuevo tercero
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
      <UiAlert v-if="entitlementsStore.isReadOnly" type="warning">
        La suscripción está vencida: puedes consultar terceros, pero no crear ni modificar hasta
        renovar el plan.
      </UiAlert>

      <UiCard>
        <div class="parties-toolbar">
          <UiSearchInput
            v-model="filters.search"
            placeholder="Buscar por nombre, documento, email o teléfono..."
            aria-label="Buscar terceros"
          />
          <UiSelect
            v-model="filters.partyType"
            :options="typeFilterOptions"
            aria-label="Filtrar por tipo"
          />
          <UiSelect
            v-model="filters.role"
            :options="roleFilterOptions"
            aria-label="Filtrar por rol"
          />
          <UiSelect
            v-model="filters.status"
            :options="statusFilterOptions"
            :clearable="false"
            aria-label="Filtrar por estado"
          />
        </div>

        <div v-if="isLoading && parties.length === 0" class="parties-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
        </div>

        <UiEmptyState
          v-else-if="parties.length === 0"
          title="No hay terceros"
          description="Registra clientes, proveedores o contactos para reutilizarlos en toda la plataforma."
        >
          <template #icon>
            <IconUsers :size="48" stroke-width="1.5" />
          </template>
          <template #action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.PARTIES.CREATE"
              width="auto"
              @click="openCreate"
            >
              Registrar tercero
            </UiButton>
          </template>
        </UiEmptyState>

        <ul v-else class="parties-list">
          <li v-for="party in parties" :key="party.id" class="party-row">
            <span class="party-avatar" aria-hidden="true">
              <IconUser v-if="party.party_type === 'person'" :size="20" stroke-width="1.8" />
              <IconBuilding v-else :size="20" stroke-width="1.8" />
            </span>

            <div class="party-copy">
              <div class="party-title-row">
                <h3 class="party-name">{{ party.name }}</h3>
                <UiBadge :label="partyTypeLabel(party.party_type)" size="sm" />
                <UiBadge
                  v-if="party.status === 'inactive'"
                  label="Inactivo"
                  variant="warning"
                  size="sm"
                />
                <UiBadge
                  v-for="role in party.roles"
                  :key="role"
                  :label="roleLabel(role)"
                  variant="info"
                  size="sm"
                />
              </div>
              <p class="party-meta">
                <span v-if="party.tax_id">NIT/Doc: {{ party.tax_id }}</span>
                <span v-if="party.email">{{ party.email }}</span>
                <span v-if="party.phone">{{ party.phone }}</span>
                <span>{{ party.identities_count }} identidades</span>
                <span>{{ party.contacts_count }} contactos</span>
              </p>
            </div>

            <div class="party-actions">
              <UiButton size="sm" variant="ghost" width="auto" @click="openDetail(party)">
                Ver detalle
              </UiButton>
              <UiButton
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.UPDATE"
                size="sm"
                variant="ghost"
                width="auto"
                @click="openEdit(party)"
              >
                Editar
              </UiButton>
              <UiButton
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.DELETE"
                size="sm"
                variant="ghost"
                width="auto"
                class="danger-action"
                @click="confirmDelete(party)"
              >
                Eliminar
              </UiButton>
            </div>
          </li>
        </ul>

        <UiPagination
          v-if="total > 0"
          :page="page"
          :limit="limit"
          :total="total"
          show-page-size
          @update:page="page = $event"
          @update:limit="limit = $event; page = 1"
        />
      </UiCard>
    </div>

    <UiFormModal
      v-model="isFormOpen"
      :title="editingParty ? 'Editar tercero' : 'Nuevo tercero'"
      :description="editingParty ? 'Actualiza los datos base y roles del tercero.' : 'Registra una persona u organización.'"
      :submit-label="editingParty ? 'Guardar cambios' : 'Crear tercero'"
      :loading="isSaving"
      :confirm-on-dirty="true"
      :dirty="isFormDirty"
      @submit="submitForm"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>

      <div class="form-grid">
        <UiSelect
          v-model="form.partyType"
          label="Tipo"
          :options="typeOptions"
          :clearable="false"
        />
        <UiSelect
          v-if="editingParty"
          v-model="form.status"
          label="Estado"
          :options="statusOptions"
          :clearable="false"
        />
        <UiInput v-model="form.name" label="Nombre" required class="span-2" />
        <UiInput v-model="form.legalName" label="Razón social (opcional)" />
        <UiInput v-model="form.taxId" label="NIT / Documento (opcional)" />
        <UiInput v-model="form.email" label="Email" type="email" />
        <UiInput v-model="form.phone" label="Teléfono" type="tel" />
      </div>

      <div class="roles-picker">
        <p class="roles-label">Roles</p>
        <div class="roles-grid">
          <label v-for="role in ROLE_OPTIONS" :key="role.value" class="role-check">
            <input v-model="form.roles" type="checkbox" :value="role.value" />
            <span>{{ role.label }}</span>
          </label>
        </div>
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isDetailOpen"
      title="Detalle del tercero"
      size="large"
      :hide-footer="true"
    >
      <div v-if="isLoadingDetail" class="parties-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="200px" />
        <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
      </div>

      <template v-else-if="detail">
        <div class="detail-header">
          <div>
            <h3>{{ detail.name }}</h3>
            <p class="party-meta">
              <span>{{ partyTypeLabel(detail.party_type) }}</span>
              <span v-if="detail.tax_id">NIT/Doc: {{ detail.tax_id }}</span>
              <span v-if="detail.email">{{ detail.email }}</span>
              <span v-if="detail.phone">{{ detail.phone }}</span>
            </p>
          </div>
          <UiBadge :label="detail.status === 'active' ? 'Activo' : 'Inactivo'" :variant="detail.status === 'active' ? 'success' : 'warning'" />
        </div>

        <section class="detail-section">
          <h4>Roles</h4>
          <div class="chips">
            <span v-for="role in detail.roles" :key="role" class="chip">
              {{ roleLabel(role) }}
              <button
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.UPDATE"
                type="button"
                aria-label="Quitar rol"
                @click="removeRole(role)"
              >
                ×
              </button>
            </span>
            <span v-if="detail.roles.length === 0" class="empty-inline">Sin roles</span>
          </div>
          <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.PARTIES.UPDATE" class="inline-form">
            <UiSelect v-model="newRole" :options="roleOptions" :clearable="false" aria-label="Nuevo rol" />
            <UiButton size="sm" variant="outline" width="auto" :disabled="!newRole" @click="addRole">
              Agregar rol
            </UiButton>
          </div>
        </section>

        <section class="detail-section">
          <h4>Identidades de canal</h4>
          <ul class="detail-list">
            <li v-for="identity in detail.identities" :key="identity.id">
              <span><UiBadge :label="identityKindLabel(identity.kind)" size="sm" /> {{ identity.value }}</span>
              <button
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.UPDATE"
                type="button"
                class="link-danger"
                @click="removeIdentity(identity.id)"
              >
                Quitar
              </button>
            </li>
            <li v-if="detail.identities.length === 0" class="empty-inline">Sin identidades</li>
          </ul>
          <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.PARTIES.UPDATE" class="inline-form">
            <UiSelect v-model="newIdentityKind" :options="identityKindOptions" :clearable="false" aria-label="Tipo de identidad" />
            <UiInput v-model="newIdentityValue" aria-label="Valor de la identidad" placeholder="Valor" />
            <UiButton size="sm" variant="outline" width="auto" :disabled="!newIdentityValue" @click="addIdentity">
              Agregar
            </UiButton>
          </div>
        </section>

        <section class="detail-section">
          <h4>Contactos</h4>
          <ul class="detail-list">
            <li v-for="contact in detail.contacts" :key="contact.id">
              <span>
                <strong>{{ contact.name }}</strong>
                <span v-if="contact.role_title"> · {{ contact.role_title }}</span>
                <span v-if="contact.email"> · {{ contact.email }}</span>
                <span v-if="contact.phone"> · {{ contact.phone }}</span>
                <UiBadge v-if="contact.is_primary" label="Principal" size="sm" variant="success" />
              </span>
              <button
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.UPDATE"
                type="button"
                class="link-danger"
                @click="removeContact(contact.id)"
              >
                Quitar
              </button>
            </li>
            <li v-if="detail.contacts.length === 0" class="empty-inline">Sin contactos</li>
          </ul>
          <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.PARTIES.UPDATE" class="inline-form inline-form--wrap">
            <UiInput v-model="newContact.name" placeholder="Nombre" aria-label="Nombre del contacto" />
            <UiInput v-model="newContact.email" placeholder="Email" type="email" aria-label="Email del contacto" />
            <UiInput v-model="newContact.phone" placeholder="Teléfono" type="tel" aria-label="Teléfono del contacto" />
            <UiButton size="sm" variant="outline" width="auto" :disabled="!newContact.name" @click="addContact">
              Agregar contacto
            </UiButton>
          </div>
        </section>

        <section class="detail-section">
          <h4>Direcciones</h4>
          <ul class="detail-list">
            <li v-for="address in detail.addresses" :key="address.id">
              <span>
                <strong>{{ address.label || 'Dirección' }}</strong> · {{ address.address }}
                <span v-if="address.city">, {{ address.city }}</span>
                <span v-if="address.state">, {{ address.state }}</span>
                <UiBadge v-if="address.is_primary" label="Principal" size="sm" variant="success" />
              </span>
              <button
                v-if="!entitlementsStore.isReadOnly"
                v-permission="Permissions.PARTIES.UPDATE"
                type="button"
                class="link-danger"
                @click="removeAddress(address.id)"
              >
                Quitar
              </button>
            </li>
            <li v-if="detail.addresses.length === 0" class="empty-inline">Sin direcciones</li>
          </ul>
          <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.PARTIES.UPDATE" class="inline-form inline-form--wrap">
            <UiInput v-model="newAddress.label" placeholder="Etiqueta" aria-label="Etiqueta de la dirección" />
            <UiInput v-model="newAddress.address" placeholder="Dirección" aria-label="Dirección" />
            <UiInput v-model="newAddress.city" placeholder="Ciudad" aria-label="Ciudad" />
            <UiButton size="sm" variant="outline" width="auto" :disabled="!newAddress.address" @click="addAddress">
              Agregar dirección
            </UiButton>
          </div>
        </section>
      </template>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Eliminar tercero"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeParty"
    >
      ¿Eliminar <strong>{{ deleteTarget?.name }}</strong>? Sus identidades se liberarán y el
      tercero dejará de aparecer en la plataforma.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import { IconBuilding, IconPlus, IconUser, IconUsers } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { partyService } from '@/services/party.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { apiErrorMessage } from '@/utils/error';
import type {
  PartyDetail,
  PartyIdentityKind,
  PartyListItem,
  PartyRole,
  PartyStatus,
  PartyType,
} from '@/types/party';

const ROLE_OPTIONS = [
  { label: 'Cliente', value: 'customer' },
  { label: 'Proveedor', value: 'supplier' },
  { label: 'Contratista', value: 'contractor' },
  { label: 'Empleado', value: 'employee' },
  { label: 'Contacto', value: 'contact' },
] as const;

const TYPE_OPTIONS = [
  { label: 'Persona', value: 'person' },
  { label: 'Organización', value: 'organization' },
] as const;

const STATUS_OPTIONS = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' },
] as const;

const IDENTITY_KIND_OPTIONS = [
  { label: 'Email', value: 'email' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Web', value: 'web' },
  { label: 'Externo', value: 'external' },
] as const;

const typeOptions = [...TYPE_OPTIONS];
const roleOptions = [...ROLE_OPTIONS];
const statusOptions = [...STATUS_OPTIONS];
const typeFilterOptions = [{ label: 'Todos los tipos', value: '' }, ...TYPE_OPTIONS];
const roleFilterOptions = [{ label: 'Todos los roles', value: '' }, ...ROLE_OPTIONS];
const statusFilterOptions = [{ label: 'Todos los estados', value: '' }, ...STATUS_OPTIONS];
const identityKindOptions = [...IDENTITY_KIND_OPTIONS];

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const parties = ref<PartyListItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const error = ref<string | null>(null);

const filters = reactive({
  search: '',
  partyType: '' as '' | PartyType,
  role: '' as '' | PartyRole,
  status: '' as '' | PartyStatus,
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

function partyTypeLabel(type: PartyType): string {
  return type === 'person' ? 'Persona' : 'Organización';
}

function roleLabel(role: PartyRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

function identityKindLabel(kind: PartyIdentityKind): string {
  return IDENTITY_KIND_OPTIONS.find((item) => item.value === kind)?.label ?? kind;
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await partyService.list({
      search: filters.search || undefined,
      partyType: filters.partyType || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
      page: page.value,
      limit: limit.value,
    });
    parties.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar los terceros');
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => filters.search,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      void load();
    }, 300);
  },
);

watch(
  () => [filters.partyType, filters.role, filters.status],
  () => {
    page.value = 1;
    void load();
  },
);

watch([page, limit], () => void load());

// --- Formulario ---
const isFormOpen = ref(false);
const editingParty = ref<PartyListItem | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);

const form = reactive({
  partyType: 'organization' as PartyType,
  name: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  status: 'active' as PartyStatus,
  roles: ['contact'] as PartyRole[],
});

const { isDirty: isFormDirty, capture: captureForm } = useDirtyForm(() => ({
  ...form,
  roles: [...form.roles],
}));

function resetForm(): void {
  form.partyType = 'organization';
  form.name = '';
  form.legalName = '';
  form.taxId = '';
  form.email = '';
  form.phone = '';
  form.status = 'active';
  form.roles = ['contact'];
  formError.value = null;
}

function openCreate(): void {
  editingParty.value = null;
  resetForm();
  captureForm();
  isFormOpen.value = true;
}

function openEdit(party: PartyListItem): void {
  editingParty.value = party;
  form.partyType = party.party_type;
  form.name = party.name;
  form.legalName = party.legal_name ?? '';
  form.taxId = party.tax_id ?? '';
  form.email = party.email ?? '';
  form.phone = party.phone ?? '';
  form.status = party.status;
  form.roles = [...party.roles];
  formError.value = null;
  captureForm();
  isFormOpen.value = true;
}

async function submitForm(): Promise<void> {
  if (!form.name.trim()) {
    formError.value = 'El nombre es obligatorio.';
    return;
  }

  isSaving.value = true;
  formError.value = null;
  try {
    if (editingParty.value) {
      await partyService.update(editingParty.value.id, {
        partyType: form.partyType,
        name: form.name.trim(),
        legalName: form.legalName.trim() || null,
        taxId: form.taxId.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
      });
      const original = new Set(editingParty.value.roles);
      const next = new Set(form.roles);
      await Promise.all([
        ...[...next].filter((role) => !original.has(role)).map((role) => partyService.addRole(editingParty.value!.id, role)),
        ...[...original].filter((role) => !next.has(role)).map((role) => partyService.removeRole(editingParty.value!.id, role)),
      ]);
      toast.success('Tercero actualizado');
    } else {
      await partyService.create({
        partyType: form.partyType,
        name: form.name.trim(),
        legalName: form.legalName.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        roles: form.roles,
      });
      toast.success('Tercero creado');
    }
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el tercero');
  } finally {
    isSaving.value = false;
  }
}

// --- Detalle ---
const isDetailOpen = ref(false);
const isLoadingDetail = ref(false);
const detail = ref<PartyDetail | null>(null);
const newRole = ref<PartyRole | ''>('');
const newIdentityKind = ref<PartyIdentityKind>('email');
const newIdentityValue = ref('');
const newContact = reactive({ name: '', email: '', phone: '' });
const newAddress = reactive({ label: '', address: '', city: '' });

async function openDetail(party: PartyListItem): Promise<void> {
  isDetailOpen.value = true;
  isLoadingDetail.value = true;
  detail.value = null;
  try {
    detail.value = (await partyService.get(party.id)).data;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar el tercero'));
    isDetailOpen.value = false;
  } finally {
    isLoadingDetail.value = false;
  }
}

async function reloadDetail(): Promise<void> {
  if (!detail.value) return;
  detail.value = (await partyService.get(detail.value.id)).data;
  await load();
}

async function addRole(): Promise<void> {
  if (!detail.value || !newRole.value) return;
  try {
    await partyService.addRole(detail.value.id, newRole.value);
    newRole.value = '';
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el rol'));
  }
}

async function removeRole(role: PartyRole): Promise<void> {
  if (!detail.value) return;
  try {
    await partyService.removeRole(detail.value.id, role);
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos quitar el rol'));
  }
}

async function addIdentity(): Promise<void> {
  if (!detail.value || !newIdentityValue.value.trim()) return;
  try {
    await partyService.addIdentity(detail.value.id, {
      kind: newIdentityKind.value,
      value: newIdentityValue.value.trim(),
    });
    newIdentityValue.value = '';
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar la identidad'));
  }
}

async function removeIdentity(identityId: string): Promise<void> {
  if (!detail.value) return;
  try {
    await partyService.removeIdentity(detail.value.id, identityId);
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos quitar la identidad'));
  }
}

async function addContact(): Promise<void> {
  if (!detail.value || !newContact.name.trim()) return;
  try {
    await partyService.addContact(detail.value.id, {
      name: newContact.name.trim(),
      email: newContact.email.trim() || undefined,
      phone: newContact.phone.trim() || undefined,
      isPrimary: detail.value.contacts.length === 0,
    });
    newContact.name = '';
    newContact.email = '';
    newContact.phone = '';
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el contacto'));
  }
}

async function removeContact(contactId: string): Promise<void> {
  if (!detail.value) return;
  try {
    await partyService.removeContact(detail.value.id, contactId);
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos quitar el contacto'));
  }
}

async function addAddress(): Promise<void> {
  if (!detail.value || !newAddress.address.trim()) return;
  try {
    await partyService.addAddress(detail.value.id, {
      label: newAddress.label.trim() || undefined,
      address: newAddress.address.trim(),
      city: newAddress.city.trim() || undefined,
      isPrimary: detail.value.addresses.length === 0,
    });
    newAddress.label = '';
    newAddress.address = '';
    newAddress.city = '';
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar la dirección'));
  }
}

async function removeAddress(addressId: string): Promise<void> {
  if (!detail.value) return;
  try {
    await partyService.removeAddress(detail.value.id, addressId);
    await reloadDetail();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos quitar la dirección'));
  }
}

// --- Eliminar ---
const isDeleteOpen = ref(false);
const deleteTarget = ref<PartyListItem | null>(null);
const isDeleting = ref(false);

function confirmDelete(party: PartyListItem): void {
  deleteTarget.value = party;
  isDeleteOpen.value = true;
}

async function removeParty(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await partyService.remove(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Tercero eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el tercero'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.parties-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.parties-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(140px, 190px));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.parties-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.parties-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.party-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.party-row + .party-row {
  border-top: 1px solid var(--border);
}

.party-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  color: var(--primary);
  flex-shrink: 0;
}

.party-copy {
  min-width: 0;
  flex: 1;
}

.party-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.party-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.party-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.party-actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.danger-action {
  color: var(--color-danger);
}

.roles-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.roles-label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-main);
}

.roles-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.role-check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.detail-header h3 {
  margin: 0;
  font-size: var(--text-lg);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.detail-section h4 {
  margin: 0;
  font-size: var(--text-sm);
}

.detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  font-size: var(--text-xs);
  color: var(--text-main);
}

.chip button {
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  font-size: var(--text-sm);
}

.inline-form {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.inline-form--wrap {
  flex-wrap: wrap;
}

.inline-form > :first-child {
  min-width: 130px;
}

.empty-inline {
  font-size: var(--text-xs);
  color: var(--text-light);
}

.link-danger {
  border: none;
  background: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: var(--text-xs);
  padding: 0;
}

@media (max-width: 900px) {
  .parties-toolbar {
    grid-template-columns: 1fr;
  }

  .party-row {
    flex-wrap: wrap;
  }

  .party-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(36px + var(--space-3));
  }
}
</style>
