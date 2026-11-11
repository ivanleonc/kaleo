<template>
  <AuthenticatedLayout>
    <div class="budget-page">
      <UiPageHeader
        :title="project ? `Presupuesto · ${project.name}` : 'Presupuesto'"
        :subtitle="project ? `${project.code} · ${project.currency_code}` : 'Cargando…'"
      >
        <template #actions>
          <UiButton variant="ghost" width="auto" @click="router.push(companyPath(`/projects/${projectId}`))">
            <IconArrowLeft :size="16" /> Proyecto
          </UiButton>
          <UiButton variant="outline" width="auto" @click="router.push(companyPath('/estimating'))">
            <IconStack2 :size="16" /> Estimación
          </UiButton>
          <UiButton v-if="budget && budget.status !== 'approved'" width="auto" :loading="isCalculating" @click="calculate">
            <IconCalculator :size="16" /> Calcular
          </UiButton>
          <UiButton v-if="budget && budget.status !== 'approved'" variant="outline" width="auto" @click="isApproveOpen = true">
            <IconLock :size="16" /> Aprobar
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
      <UiAlert v-if="budget?.status === 'approved'" type="info">
        Presupuesto aprobado y bloqueado. Crea una nueva versión para modificarlo.
      </UiAlert>

      <div v-if="isLoading" class="budget-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="260px" />
        <UiSkeleton v-for="n in 6" :key="n" variant="text" width="100%" />
      </div>

      <UiCard v-else-if="!budget">
        <UiEmptyState
          title="El proyecto todavía no tiene presupuesto"
          description="Crea el presupuesto para agregar capítulos, actividades y APUs."
        >
          <template #icon><IconCalculator :size="48" stroke-width="1.5" /></template>
          <template #action>
            <UiButton width="auto" :loading="isCreating" @click="createBudget">
              Crear presupuesto
            </UiButton>
          </template>
        </UiEmptyState>
      </UiCard>

      <template v-else>
        <UiCard>
          <div class="budget-toolbar">
            <div class="budget-toolbar-left">
              <UiButton
                v-if="editable"
                size="sm"
                variant="outline"
                width="auto"
                @click="openChapter"
              >
                <IconPlus :size="15" /> Capítulo
              </UiButton>
              <UiButton
                v-if="editable"
                size="sm"
                variant="outline"
                width="auto"
                @click="openActivity"
              >
                <IconPlus :size="15" /> Actividad
              </UiButton>
              <UiButton
                v-if="editable"
                size="sm"
                variant="outline"
                width="auto"
                @click="openApus"
              >
                <IconStack2 :size="15" /> Desde APUs
              </UiButton>
            </div>
            <div class="budget-toolbar-right">
              <UiButton
                v-if="(budget.items ?? []).some((row) => row.item_type === 'chapter')"
                size="sm"
                variant="ghost"
                width="auto"
                @click="toggleAll"
              >
                {{ allExpanded ? 'Colapsar todo' : 'Expandir todo' }}
              </UiButton>
              <UiSearchInput v-model="search" placeholder="Buscar actividad..." aria-label="Buscar actividades" />
            </div>
          </div>

          <div class="budget-table">
            <div class="budget-head">
              <span></span>
              <span>Código</span>
              <span>Actividad</span>
              <span>Unidad</span>
              <span>Cantidad</span>
              <span>Valor unitario</span>
              <span>Valor parcial</span>
              <span>Responsable</span>
              <span>Comandos</span>
            </div>

            <div
              v-for="row in visibleRows"
              :key="row.id"
              class="budget-row"
              :class="{ 'is-chapter': row.item_type === 'chapter' }"
            >
              <button
                v-if="row.item_type === 'chapter' && row.has_children"
                type="button"
                class="expand-btn"
                :aria-label="expanded.has(row.id) ? 'Colapsar capítulo' : 'Expandir capítulo'"
                @click="toggleChapter(row.id)"
              >
                <IconChevronDown :size="15" :class="{ 'is-collapsed': !expanded.has(row.id) }" />
              </button>
              <span v-else></span>

              <span class="budget-code">{{ row.code }}</span>
              <span class="budget-name" :style="{ paddingLeft: `${row.depth * 14}px` }">
                {{ row.name }}
              </span>
              <span>{{ row.unit_code || '' }}</span>
              <span>
                <input
                  v-if="row.item_type === 'activity' && editable"
                  v-model.number="row.quantity"
                  type="number"
                  class="grid-input"
                  min="0"
                  aria-label="Cantidad"
                  @change="updateItem(row.id, { quantity: Number(row.quantity) })"
                />
                <span v-else>{{ row.item_type === 'activity' ? formatNumber(row.quantity, 4) : '' }}</span>
              </span>
              <span>
                <input
                  v-if="row.item_type === 'activity' && editable && !row.apu_id"
                  v-model.number="row.unit_price"
                  type="number"
                  class="grid-input"
                  min="0"
                  aria-label="Valor unitario"
                  @change="updateItem(row.id, { unitPrice: Number(row.unit_price) })"
                />
                <span v-else>{{ row.item_type === 'activity' ? formatMoney(row.unit_price, budget.currency_code) : '' }}</span>
              </span>
              <span class="budget-amount">{{ formatMoney(row.partial_amount, budget.currency_code) }}</span>
              <span class="budget-assignee">{{ row.assigned_user_name || '—' }}</span>
              <span class="budget-actions">
                <UiButton
                  v-if="row.item_type === 'activity' && row.apu_id"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openApu(row.apu_id)"
                >
                  Ver APU
                </UiButton>
                <UiButton
                  v-if="editable"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openEdit(row)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-if="editable"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmDelete(row)"
                >
                  Eliminar
                </UiButton>
              </span>
            </div>

            <p v-if="visibleRows.length === 0" class="budget-empty">
              No hay actividades. Agrega un capítulo o importa APUs.
            </p>
          </div>

          <template #footer>
            <div class="budget-footer">
              <div class="indirect-fields">
                <UiInput
                  v-model="indirects.pct"
                  label="Indirecto %"
                  type="number"
                  :disabled="!editable"
                />
                <UiInput
                  v-model="indirects.fixed"
                  label="Indirecto fijo"
                  type="number"
                  :disabled="!editable"
                />
                <UiButton
                  v-if="editable"
                  size="sm"
                  variant="outline"
                  width="auto"
                  :loading="isSavingIndirects"
                  @click="saveIndirects"
                >
                  Guardar indirectos
                </UiButton>
              </div>
              <div class="budget-totals">
                <span>Directo: <strong>{{ formatMoney(budget.subtotal, budget.currency_code) }}</strong></span>
                <span>Indirecto: <strong>{{ formatMoney(budget.indirect_total, budget.currency_code) }}</strong></span>
                <span class="budget-total">Total: <strong>{{ formatMoney(budget.total, budget.currency_code) }}</strong></span>
              </div>
            </div>
          </template>
        </UiCard>
      </template>
    </div>

    <UiFormModal
      v-model="isChapterOpen"
      title="Nuevo capítulo"
      submit-label="Crear capítulo"
      :loading="isSavingItem"
      @submit="saveChapter"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiInput v-model="chapterForm.name" label="Nombre" required />
      <UiInput v-model="chapterForm.code" label="Código (opcional)" placeholder="01" />
    </UiFormModal>

    <UiFormModal
      v-model="isActivityOpen"
      title="Nueva actividad manual"
      submit-label="Crear actividad"
      :loading="isSavingItem"
      size="large"
      @submit="saveActivity"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiSelect v-model="activityForm.parentId" label="Capítulo" :options="chapterOptions" />
        <UiInput v-model="activityForm.code" label="Código (opcional)" />
        <UiInput v-model="activityForm.name" label="Actividad" required class="span-2" />
        <UiSelect v-model="activityForm.unitId" label="Unidad" :options="unitOptions" :clearable="false" />
        <UiInput v-model="activityForm.quantity" label="Cantidad" type="number" />
        <UiInput v-model="activityForm.unitPrice" label="Valor unitario" type="number" />
        <UiSelect v-model="activityForm.assignedMembershipId" label="Responsable" :options="memberOptions" />
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isEditOpen"
      title="Editar actividad"
      submit-label="Guardar"
      :loading="isSavingItem"
      size="large"
      @submit="saveEdit"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid" v-if="editForm">
        <UiInput v-model="editForm.name" label="Actividad" required class="span-2" />
        <UiInput v-model="editForm.quantity" label="Cantidad" type="number" />
        <UiInput v-model="editForm.unit_price" label="Valor unitario" type="number" :disabled="Boolean(editForm.apu_id)" />
        <UiSelect v-model="editForm.assigned_membership_id" label="Responsable" :options="memberOptions" />
        <UiInput v-model="editForm.notes" label="Notas" />
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isApusOpen"
      title="Añadir actividades desde APUs"
      size="large"
      :hide-footer="true"
    >
      <div class="apus-picker">
        <div class="apus-picker-toolbar">
          <UiSelect v-model="apuBaseId" :options="apuBaseOptions" placeholder="Base de APUs" :clearable="false" />
          <UiSelect v-model="apuParentId" :options="chapterOptions" placeholder="Capítulo destino" />
          <UiSearchInput v-model="apuSearch" placeholder="Buscar APU..." aria-label="Buscar APU" />
        </div>

        <div v-if="isLoadingApus" class="budget-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
        </div>
        <ul v-else class="apus-list">
          <li v-for="apu in filteredApus" :key="apu.id">
            <label class="apu-check">
              <input v-model="selectedApus" type="checkbox" :value="apu.id" />
              <span class="apu-check-copy">
                <strong>{{ apu.code }} · {{ apu.name }}</strong>
                <span>{{ apu.base_name }} · {{ apu.unit_code }} · {{ formatMoney(apu.unit_cost, budget?.currency_code) }}</span>
              </span>
            </label>
          </li>
          <li v-if="filteredApus.length === 0" class="budget-empty">No hay APUs para esta base.</li>
        </ul>

        <div class="apus-picker-actions">
          <UiButton variant="ghost" width="auto" @click="isApusOpen = false">Cancelar</UiButton>
          <UiButton
            width="auto"
            :loading="isSavingItem"
            :disabled="selectedApus.length === 0"
            @click="sendApus"
          >
            Enviar ({{ selectedApus.length }})
          </UiButton>
        </div>
      </div>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Eliminar actividad"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeItem"
    >
      ¿Eliminar <strong>{{ deleteTarget?.name }}</strong>? Si es un capítulo, se eliminarán sus
      actividades.
    </UiConfirmDialog>

    <UiConfirmDialog
      v-model="isApproveOpen"
      title="Aprobar presupuesto"
      variant="danger"
      confirm-label="Aprobar y bloquear"
      :loading="isApproving"
      @confirm="approve"
    >
      Al aprobar, el presupuesto queda bloqueado y se guarda un snapshot de costos.
    </UiConfirmDialog>

    <ApuDetailModal v-model="isApuDetailOpen" :apu-id="selectedApuId" />
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import ApuDetailModal from '@/components/estimating/ApuDetailModal.vue';
import {
  IconArrowLeft,
  IconCalculator,
  IconChevronDown,
  IconLock,
  IconPlus,
  IconStack2,
} from '@tabler/icons-vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { budgetService } from '@/services/budget.service';
import { projectService } from '@/services/project.service';
import { estimatingService } from '@/services/estimating.service';
import { catalogService } from '@/services/catalog.service';
import { memberService } from '@/services/member.service';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type { Project } from '@/types/project';
import type { BudgetDetail, BudgetItem } from '@/types/budget';
import type { Apu, ApuBase } from '@/types/estimating';
import type { Unit } from '@/types/catalog';
import type { Member } from '@/types/member';

interface BudgetTreeRow extends BudgetItem {
  depth: number;
  has_children: boolean;
}

const route = useRoute();
const router = useRouter();
const { companyPath } = useCompanyPath();
const toast = useToast();

const projectId = computed(() => String(route.params.projectId ?? ''));
const project = ref<Project | null>(null);
const budget = ref<BudgetDetail | null>(null);
const isLoading = ref(true);
const isCreating = ref(false);
const isCalculating = ref(false);
const isSavingIndirects = ref(false);
const error = ref<string | null>(null);
const search = ref('');

const units = ref<Unit[]>([]);
const members = ref<Member[]>([]);
const apuBases = ref<ApuBase[]>([]);
const apus = ref<Apu[]>([]);
const apuBaseId = ref('');
const apuSearch = ref('');
const isLoadingApus = ref(false);

const expanded = ref(new Set<string>());
const indirects = reactive({ pct: '0', fixed: '0' });

const editable = computed(() => budget.value?.status !== 'approved');
const unitOptions = computed(() =>
  units.value.map((unit) => ({ label: `${unit.code} · ${unit.name}`, value: unit.id })),
);
const memberOptions = computed(() =>
  members.value.map((member) => ({ label: `${member.name} · ${member.email}`, value: member.id })),
);
const apuBaseOptions = computed(() =>
  apuBases.value.map((base) => ({ label: base.name, value: base.id })),
);
const chapterOptions = computed(() => [
  { label: 'Sin capítulo', value: '' },
  ...(budget.value?.items ?? [])
    .filter((item) => item.item_type === 'chapter')
    .map((item) => ({ label: `${item.code} · ${item.name}`, value: item.id })),
]);

const filteredApus = computed(() => {
  const query = apuSearch.value.trim().toLowerCase();
  if (!query) return apus.value;
  return apus.value.filter(
    (apu) =>
      apu.code.toLowerCase().includes(query) || apu.name.toLowerCase().includes(query),
  );
});

const tree = computed(() => {
  const items = budget.value?.items ?? [];
  const byParent = new Map<string | null, BudgetItem[]>();
  for (const item of items) {
    const key = item.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const build = (parentId: string | null, depth: number): BudgetTreeRow[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
      .flatMap((item) => [
        { ...item, depth, has_children: (byParent.get(item.id) ?? []).length > 0 } as BudgetTreeRow,
        ...build(item.id, depth + 1),
      ]);
  return build(null, 0);
});

const visibleRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  const hiddenParents = new Set<string>();
  const rows: BudgetTreeRow[] = [];
  for (const row of tree.value) {
    if (row.parent_id && (hiddenParents.has(row.parent_id) || isCollapsedAncestor(row))) continue;
    if (!expanded.value.has(row.id) && row.has_children) {
      hiddenParents.add(row.id);
    }
    if (!query || row.code.toLowerCase().includes(query) || row.name.toLowerCase().includes(query)) {
      rows.push(row);
    }
  }
  return rows;
  function isCollapsedAncestor(row: BudgetTreeRow): boolean {
    let parentId = row.parent_id;
    while (parentId) {
      if (!expanded.value.has(parentId)) return true;
      parentId = tree.value.find((item) => item.id === parentId)?.parent_id ?? null;
    }
    return false;
  }
});

const allExpanded = computed(() =>
  (budget.value?.items ?? []).filter((item) => item.item_type === 'chapter').every((item) => expanded.value.has(item.id)),
);

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number, currency = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    project.value = await projectService.get(projectId.value);
    budget.value = await budgetService.getByProject(projectId.value);
    if (budget.value) {
      indirects.pct = String(budget.value.indirect_pct);
      indirects.fixed = String(budget.value.indirect_fixed);
      expanded.value = new Set(
        budget.value.items.filter((item) => item.item_type === 'chapter').map((item) => item.id),
      );
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar el presupuesto');
  } finally {
    isLoading.value = false;
  }
}

async function loadLookups(): Promise<void> {
  const [unitData, memberResponse, bases] = await Promise.all([
    catalogService.listUnits(),
    memberService.getMembers({ limit: 100 }),
    estimatingService.listApuBases(),
  ]);
  units.value = unitData;
  members.value = memberResponse.data;
  apuBases.value = bases;
  if (!apuBaseId.value && bases[0]) apuBaseId.value = bases[0].id;
}

async function createBudget(): Promise<void> {
  isCreating.value = true;
  try {
    budget.value = await budgetService.create(projectId.value);
    toast.success('Presupuesto creado');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos crear el presupuesto');
  } finally {
    isCreating.value = false;
  }
}

async function calculate(): Promise<void> {
  if (!budget.value) return;
  isCalculating.value = true;
  try {
    budget.value = await budgetService.calculate(budget.value.id);
    toast.success('Presupuesto calculado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos calcular el presupuesto'));
  } finally {
    isCalculating.value = false;
  }
}

async function saveIndirects(): Promise<void> {
  if (!budget.value) return;
  isSavingIndirects.value = true;
  try {
    budget.value = await budgetService.update(budget.value.id, {
      indirectPct: Number(indirects.pct),
      indirectFixed: Number(indirects.fixed),
    });
    toast.success('Indirectos actualizados');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos guardar los indirectos'));
  } finally {
    isSavingIndirects.value = false;
  }
}

async function updateItem(
  itemId: string,
  payload: { quantity?: number; unitPrice?: number },
): Promise<void> {
  if (!budget.value) return;
  try {
    budget.value = await budgetService.updateItem(budget.value.id, itemId, payload);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos actualizar la actividad'));
    await load();
  }
}

function toggleChapter(id: string): void {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function toggleAll(): void {
  expanded.value = allExpanded.value
    ? new Set()
    : new Set(
        (budget.value?.items ?? [])
          .filter((item) => item.item_type === 'chapter')
          .map((item) => item.id),
      );
}

// --- Capítulos y actividades ---
const isChapterOpen = ref(false);
const isActivityOpen = ref(false);
const isEditOpen = ref(false);
const isSavingItem = ref(false);
const formError = ref<string | null>(null);
const chapterForm = reactive({ name: '', code: '' });
const activityForm = reactive({
  parentId: '',
  code: '',
  name: '',
  unitId: '',
  quantity: '0',
  unitPrice: '0',
  assignedMembershipId: '',
});
interface EditBudgetItemForm {
  id: string;
  name: string;
  quantity: string;
  unit_price: string;
  assigned_membership_id: string;
  notes: string;
  apu_id: string | null;
}

const editForm = ref<EditBudgetItemForm | null>(null);

function openChapter(): void {
  chapterForm.name = '';
  chapterForm.code = '';
  formError.value = null;
  isChapterOpen.value = true;
}

function openActivity(): void {
  Object.assign(activityForm, {
    parentId: '',
    code: '',
    name: '',
    unitId: units.value[0]?.id ?? '',
    quantity: '0',
    unitPrice: '0',
    assignedMembershipId: '',
  });
  formError.value = null;
  isActivityOpen.value = true;
}

function openEdit(row: BudgetItem): void {
  editForm.value = {
    id: row.id,
    name: row.name,
    quantity: String(row.quantity),
    unit_price: String(row.unit_price),
    assigned_membership_id: row.assigned_membership_id ?? '',
    notes: row.notes ?? '',
    apu_id: row.apu_id,
  };
  formError.value = null;
  isEditOpen.value = true;
}

async function saveChapter(): Promise<void> {
  if (!budget.value || !chapterForm.name.trim()) {
    formError.value = 'El nombre es obligatorio.';
    return;
  }
  isSavingItem.value = true;
  try {
    budget.value = await budgetService.addItem(budget.value.id, {
      name: chapterForm.name.trim(),
      code: chapterForm.code.trim() || undefined,
      itemType: 'chapter',
    });
    isChapterOpen.value = false;
    toast.success('Capítulo creado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos crear el capítulo');
  } finally {
    isSavingItem.value = false;
  }
}

async function saveActivity(): Promise<void> {
  if (!budget.value || !activityForm.name.trim() || !activityForm.unitId) {
    formError.value = 'Nombre y unidad son obligatorios.';
    return;
  }
  isSavingItem.value = true;
  try {
    budget.value = await budgetService.addItem(budget.value.id, {
      parentId: activityForm.parentId || null,
      code: activityForm.code.trim() || undefined,
      name: activityForm.name.trim(),
      itemType: 'activity',
      unitId: activityForm.unitId,
      quantity: Number(activityForm.quantity),
      unitPrice: Number(activityForm.unitPrice),
      assignedMembershipId: activityForm.assignedMembershipId || null,
    });
    isActivityOpen.value = false;
    toast.success('Actividad creada');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos crear la actividad');
  } finally {
    isSavingItem.value = false;
  }
}

async function saveEdit(): Promise<void> {
  if (!budget.value || !editForm.value) return;
  isSavingItem.value = true;
  try {
    budget.value = await budgetService.updateItem(budget.value.id, editForm.value.id, {
      name: editForm.value.name,
      quantity: Number(editForm.value.quantity),
      unitPrice: Number(editForm.value.unit_price),
      assignedMembershipId: editForm.value.assigned_membership_id || null,
      notes: editForm.value.notes || null,
    });
    isEditOpen.value = false;
    toast.success('Actividad actualizada');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos actualizar la actividad');
  } finally {
    isSavingItem.value = false;
  }
}

// --- Desde APUs ---
const isApusOpen = ref(false);
const selectedApus = ref<string[]>([]);
const apuParentId = ref('');

async function openApus(): Promise<void> {
  selectedApus.value = [];
  apuSearch.value = '';
  apuParentId.value = '';
  isApusOpen.value = true;
  if (!apuBases.value.length) await loadLookups();
  await loadApus();
}

async function loadApus(): Promise<void> {
  if (!apuBaseId.value) {
    apus.value = [];
    return;
  }
  isLoadingApus.value = true;
  try {
    apus.value = await estimatingService.listApus({ baseId: apuBaseId.value });
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar los APUs'));
  } finally {
    isLoadingApus.value = false;
  }
}

watch(apuBaseId, loadApus);

async function sendApus(): Promise<void> {
  if (!budget.value || selectedApus.value.length === 0) return;
  isSavingItem.value = true;
  try {
    budget.value = await budgetService.addFromApus(budget.value.id, {
      apuIds: selectedApus.value,
      parentId: apuParentId.value || null,
    });
    isApusOpen.value = false;
    toast.success(`${selectedApus.value.length} actividades agregadas`);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar las actividades'));
  } finally {
    isSavingItem.value = false;
  }
}

// --- Eliminar / aprobar ---
const isDeleteOpen = ref(false);
const deleteTarget = ref<BudgetItem | null>(null);
const isDeleting = ref(false);
const isApproveOpen = ref(false);
const isApproving = ref(false);

function confirmDelete(row: BudgetItem): void {
  deleteTarget.value = row;
  isDeleteOpen.value = true;
}

async function removeItem(): Promise<void> {
  if (!budget.value || !deleteTarget.value) return;
  isDeleting.value = true;
  try {
    budget.value = await budgetService.deleteItem(budget.value.id, deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Actividad eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la actividad'));
  } finally {
    isDeleting.value = false;
  }
}

async function approve(): Promise<void> {
  if (!budget.value) return;
  isApproving.value = true;
  try {
    budget.value = await budgetService.approve(budget.value.id);
    isApproveOpen.value = false;
    toast.success('Presupuesto aprobado y bloqueado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos aprobar el presupuesto'));
  } finally {
    isApproving.value = false;
  }
}

// --- APU detalle ---
const isApuDetailOpen = ref(false);
const selectedApuId = ref<string | null>(null);

function openApu(id: string): void {
  selectedApuId.value = id;
  isApuDetailOpen.value = true;
}

onMounted(async () => {
  await Promise.all([load(), loadLookups()]);
});
</script>

<style scoped>
.budget-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.budget-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.budget-toolbar {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.budget-toolbar-left,
.budget-toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.budget-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.budget-head,
.budget-row {
  display: grid;
  grid-template-columns: 28px 80px minmax(220px, 1fr) 60px 90px 120px 120px 120px 220px;
  gap: var(--space-2);
  align-items: center;
  min-width: 1080px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.budget-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.budget-row {
  border-top: 1px solid var(--border);
  color: var(--text-main);
}

.budget-row.is-chapter {
  background: var(--bg-hover);
  font-weight: 600;
}

.budget-code {
  color: var(--text-muted);
}

.budget-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.budget-amount {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.budget-assignee {
  color: var(--text-muted);
}

.budget-actions {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.expand-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.expand-btn svg {
  transition: transform .15s ease;
}

.expand-btn svg.is-collapsed {
  transform: rotate(-90deg);
}

.grid-input {
  width: 100%;
  min-width: 0;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-app);
  color: var(--text-main);
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
}

.budget-empty {
  padding: var(--space-5);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.budget-footer {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  width: 100%;
}

.indirect-fields {
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
  flex-wrap: wrap;
}

.budget-totals {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.budget-total {
  color: var(--text-main);
  font-size: var(--text-base);
}

.danger-action {
  color: var(--color-danger);
}

.apus-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.apus-picker-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(180px, 220px) minmax(180px, 1fr);
  gap: var(--space-2);
}

.apus-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 380px;
  overflow: auto;
}

.apus-list li + li {
  border-top: 1px solid var(--border);
}

.apu-check {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-2);
  cursor: pointer;
}

.apu-check-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-sm);
}

.apu-check-copy span {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.apus-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

@media (max-width: 900px) {
  .apus-picker-toolbar {
    grid-template-columns: 1fr;
  }

  .budget-footer {
    flex-direction: column;
  }
}
</style>
