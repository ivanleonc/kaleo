<template>
  <AuthenticatedLayout>
    <div class="catalog-container">
      <UiPageHeader
        title="Catálogo"
        subtitle="Monedas, unidades de medida, conversiones e impuestos para tus operaciones."
      >
        <template #actions>
          <UiButton
            v-if="!entitlementsStore.isReadOnly && activeTab === 'units'"
            v-permission="Permissions.CATALOG.CREATE"
            width="auto"
            @click="openUnitCreate"
          >
            <IconPlus :size="16" /> Nueva unidad
          </UiButton>
          <UiButton
            v-if="!entitlementsStore.isReadOnly && activeTab === 'taxes'"
            v-permission="Permissions.CATALOG.CREATE"
            width="auto"
            @click="openTaxCreate"
          >
            <IconPlus :size="16" /> Nuevo impuesto
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
      <UiAlert v-if="entitlementsStore.isReadOnly" type="warning">
        La suscripción está vencida: puedes consultar el catálogo, pero no modificarlo hasta
        renovar el plan.
      </UiAlert>

      <UiTabs
        v-model="activeTabModel"
        :tabs="TABS"
        group-label="Secciones del catálogo"
        variant="pills"
        panel-id-prefix="catalog"
      />

      <!-- Unidades -->
      <UiCard
        v-if="activeTab === 'units'"
        id="catalog-panel-units"
        role="tabpanel"
        aria-labelledby="catalog-tab-units"
      >
        <div class="catalog-toolbar">
          <UiSearchInput v-model="unitFilters.search" placeholder="Buscar unidad..." aria-label="Buscar unidades" />
          <UiSelect v-model="unitFilters.kind" :options="kindFilterOptions" aria-label="Filtrar por tipo" />
          <UiSelect
            v-model="unitFilters.includeInactive"
            :options="activeFilterOptions"
            :clearable="false"
            aria-label="Incluir inactivas"
          />
        </div>

        <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
        </div>

        <ul v-else-if="units.length > 0" class="catalog-list">
          <li v-for="unit in units" :key="unit.id" class="catalog-row">
            <span class="catalog-badge">{{ unit.code }}</span>
            <div class="catalog-copy">
              <div class="catalog-title-row">
                <h3>{{ unit.name }}</h3>
                <UiBadge :label="kindLabel(unit.kind)" size="sm" />
                <UiBadge
                  :label="unit.is_global ? 'Global' : 'Empresa'"
                  :variant="unit.is_global ? 'neutral' : 'info'"
                  size="sm"
                />
                <UiBadge v-if="!unit.is_active" label="Inactiva" variant="warning" size="sm" />
              </div>
              <p class="catalog-meta">
                Precisión: {{ unit.precision }} decimales · {{ unit.conversions_count }} conversiones
              </p>
            </div>
            <div class="catalog-actions">
              <UiButton size="sm" variant="ghost" width="auto" @click="openConversions(unit)">
                Conversiones
              </UiButton>
              <template v-if="!unit.is_global && !entitlementsStore.isReadOnly">
                <UiButton
                  v-permission="Permissions.CATALOG.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openUnitEdit(unit)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-permission="Permissions.CATALOG.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmDelete('unit', unit.id, unit.name)"
                >
                  Eliminar
                </UiButton>
              </template>
            </div>
          </li>
        </ul>
        <UiEmptyState
          v-else
          title="Sin unidades para este filtro"
          description="Ajusta la búsqueda o crea una unidad propia de la empresa."
        >
          <template #action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.CATALOG.CREATE"
              width="auto"
              @click="openUnitCreate"
            >
              <IconPlus :size="16" /> Nueva unidad
            </UiButton>
          </template>
        </UiEmptyState>
      </UiCard>

      <!-- Ítems -->
      <div
        v-else-if="activeTab === 'items'"
        id="catalog-panel-items"
        role="tabpanel"
        aria-labelledby="catalog-tab-items"
      >
        <CatalogItemsTab />
      </div>

      <!-- Categorías -->
      <div
        v-else-if="activeTab === 'categories'"
        id="catalog-panel-categories"
        role="tabpanel"
        aria-labelledby="catalog-tab-categories"
      >
        <CatalogCategoriesTab />
      </div>

      <!-- Listas de precios -->
      <div
        v-else-if="activeTab === 'priceLists'"
        id="catalog-panel-priceLists"
        role="tabpanel"
        aria-labelledby="catalog-tab-priceLists"
      >
        <CatalogPriceListsTab />
      </div>

      <!-- Impuestos -->
      <UiCard
        v-else-if="activeTab === 'taxes'"
        id="catalog-panel-taxes"
        role="tabpanel"
        aria-labelledby="catalog-tab-taxes"
      >
        <div class="catalog-toolbar">
          <UiSearchInput v-model="taxFilters.search" placeholder="Buscar impuesto..." aria-label="Buscar impuestos" />
          <UiSelect
            v-model="taxFilters.includeInactive"
            :options="activeFilterOptions"
            :clearable="false"
            aria-label="Incluir inactivos"
          />
        </div>

        <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
        </div>

        <ul v-else-if="taxRates.length > 0" class="catalog-list">
          <li v-for="tax in taxRates" :key="tax.id" class="catalog-row">
            <span class="catalog-badge">{{ formatRate(tax.rate) }}%</span>
            <div class="catalog-copy">
              <div class="catalog-title-row">
                <h3>{{ tax.name }}</h3>
                <UiBadge :label="tax.code" size="sm" />
                <UiBadge v-if="tax.country_code" :label="tax.country_code" size="sm" />
                <UiBadge v-if="!tax.is_active" label="Inactivo" variant="warning" size="sm" />
              </div>
              <p class="catalog-meta">Tasa {{ formatRate(tax.rate) }}%</p>
            </div>
            <div v-if="!entitlementsStore.isReadOnly" class="catalog-actions">
              <UiButton
                v-permission="Permissions.CATALOG.UPDATE"
                size="sm"
                variant="ghost"
                width="auto"
                @click="openTaxEdit(tax)"
              >
                Editar
              </UiButton>
              <UiButton
                v-permission="Permissions.CATALOG.DELETE"
                size="sm"
                variant="ghost"
                width="auto"
                class="danger-action"
                @click="confirmDelete('tax', tax.id, tax.name)"
              >
                Eliminar
              </UiButton>
            </div>
          </li>
        </ul>
        <UiEmptyState
          v-else
          title="Sin impuestos configurados"
          description="Crea un impuesto para aplicarlo en documentos y listas de precios."
        >
          <template #action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.CATALOG.CREATE"
              width="auto"
              @click="openTaxCreate"
            >
              <IconPlus :size="16" /> Nuevo impuesto
            </UiButton>
          </template>
        </UiEmptyState>
      </UiCard>

      <!-- Monedas -->
      <UiCard
        v-else
        id="catalog-panel-currencies"
        role="tabpanel"
        aria-labelledby="catalog-tab-currencies"
      >
        <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
        </div>
        <ul v-else-if="currencies.length > 0" class="catalog-list">
          <li v-for="currency in currencies" :key="currency.code" class="catalog-row">
            <span class="catalog-badge">{{ currency.code }}</span>
            <div class="catalog-copy">
              <h3>{{ currency.name }}</h3>
              <p class="catalog-meta">
                Símbolo: {{ currency.symbol }} · {{ currency.decimal_digits }} decimales
              </p>
            </div>
          </li>
        </ul>
        <UiEmptyState
          v-else
          title="Sin monedas disponibles"
          description="La empresa no tiene monedas configuradas en el catálogo compartido."
        />
      </UiCard>
    </div>

    <!-- Unidad -->
    <UiFormModal
      v-model="isUnitOpen"
      :title="editingUnit ? 'Editar unidad' : 'Nueva unidad'"
      :description="
        editingUnit
          ? `Actualiza ${editingUnit.code} · ${editingUnit.name}.`
          : 'Las unidades propias se usan en recursos, APUs y presupuestos.'
      "
      :submit-label="editingUnit ? 'Guardar' : 'Crear unidad'"
      :loading="isSaving"
      footer-hint="Las unidades globales del sistema no se editan; crea una propia si necesitas otra escala."
      @submit="saveUnit"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Datos de la unidad" description="Código, nombre y magnitud que representa.">
        <div class="form-grid">
          <UiInput v-model="unitForm.code" label="Código" required hint="Ej. m2, kg, hr." />
          <UiInput v-model="unitForm.name" label="Nombre" required />
          <UiSelect v-model="unitForm.kind" label="Tipo" :options="kindOptions" :clearable="false" />
          <UiInput
            v-model="unitForm.precision"
            label="Decimales"
            type="number"
            hint="Decimales usados al mostrar cantidades."
          />
          <UiSwitch v-if="editingUnit" v-model="unitForm.isActive" label="Activa" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Conversiones -->
    <UiFormModal
      v-model="isConversionsOpen"
      :title="conversionUnit ? `Conversiones de ${conversionUnit.code}` : 'Conversiones'"
      description="Equivalencias entre unidades para convertir cantidades automáticamente."
      size="large"
      :hide-footer="true"
    >
      <UiFormSection v-if="!entitlementsStore.isReadOnly" title="Nueva conversión" description="Indica la unidad destino y el factor de equivalencia.">
      <div v-permission="Permissions.CATALOG.CREATE" class="inline-form">
        <UiSelect
          v-model="newConversion.toUnitId"
          :options="conversionTargetOptions"
          placeholder="Unidad destino"
          :clearable="false"
        />
        <UiInput
          v-model="newConversion.factor"
          label="Factor"
          type="number"
          hint="1 unidad origen = factor × unidad destino."
        />
        <UiButton
          size="sm"
          variant="outline"
          width="auto"
          :disabled="!newConversion.toUnitId || !newConversion.factor"
          @click="addConversion"
        >
          Agregar
        </UiButton>
      </div>
      </UiFormSection>

      <ul v-if="conversions.length > 0" class="catalog-list">
        <li v-for="conversion in conversions" :key="conversion.id" class="catalog-row">
          <div class="catalog-copy">
            <h3>1 {{ conversion.from_code }} = {{ conversion.factor }} {{ conversion.to_code }}</h3>
            <p class="catalog-meta">
              {{ conversion.from_name }} → {{ conversion.to_name }}
              <span v-if="!conversion.company_id"> · Global</span>
            </p>
          </div>
          <UiButton
            v-if="conversion.company_id && !entitlementsStore.isReadOnly"
            v-permission="Permissions.CATALOG.DELETE"
            size="sm"
            variant="ghost"
            width="auto"
            class="danger-action"
            @click="deleteConversion(conversion.id)"
          >
            Quitar
          </UiButton>
        </li>
      </ul>
      <UiEmptyState
        v-else
        title="Sin conversiones registradas"
        description="Agrega una equivalencia para convertir esta unidad a otra."
      />
    </UiFormModal>

    <!-- Impuesto -->
    <UiFormModal
      v-model="isTaxOpen"
      :title="editingTax ? 'Editar impuesto' : 'Nuevo impuesto'"
      :description="
        editingTax
          ? `Actualiza ${editingTax.code} · ${editingTax.name}.`
          : 'Los impuestos se aplican en documentos y listas de precios.'
      "
      :submit-label="editingTax ? 'Guardar' : 'Crear impuesto'"
      :loading="isSaving"
      footer-hint="La tasa se expresa en porcentaje; por ejemplo, IVA 19."
      @submit="saveTax"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Datos del impuesto" description="Código, nombre, tasa y país de aplicación.">
        <div class="form-grid">
          <UiInput v-model="taxForm.code" label="Código" required hint="Ej. IVA19." />
          <UiInput v-model="taxForm.name" label="Nombre" required />
          <UiInput v-model="taxForm.rate" label="Tasa (%)" type="number" hint="Ej. 19 para IVA del 19 %." />
          <UiInput v-model="taxForm.countryCode" label="País ISO (opcional)" placeholder="CO" hint="Código de dos letras." />
          <UiSwitch v-if="editingTax" v-model="taxForm.isActive" label="Activo" class="span-2" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Eliminar del catálogo"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeTarget"
    >
      ¿Eliminar <strong>{{ deleteTarget?.name }}</strong>? Esta acción no se puede deshacer.
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiTabs from '@/components/ui/UiTabs.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import CatalogItemsTab from '@/components/catalog/CatalogItemsTab.vue';
import CatalogCategoriesTab from '@/components/catalog/CatalogCategoriesTab.vue';
import CatalogPriceListsTab from '@/components/catalog/CatalogPriceListsTab.vue';
import { IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { catalogService } from '@/services/catalog.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type {
  Currency,
  TaxRate,
  Unit,
  UnitConversion,
  UnitKind,
} from '@/types/catalog';
import type { UiTabItem } from '@/types/ui';

type CatalogTab = 'units' | 'items' | 'categories' | 'taxes' | 'priceLists' | 'currencies';
type DeleteKind = 'unit' | 'tax';

const TABS: UiTabItem[] = [
  { label: 'Unidades', value: 'units' },
  { label: 'Ítems', value: 'items' },
  { label: 'Categorías', value: 'categories' },
  { label: 'Impuestos', value: 'taxes' },
  { label: 'Listas de precios', value: 'priceLists' },
  { label: 'Monedas', value: 'currencies' },
];

const KIND_OPTIONS = [
  { label: 'Longitud', value: 'length' },
  { label: 'Área', value: 'area' },
  { label: 'Volumen', value: 'volume' },
  { label: 'Masa', value: 'mass' },
  { label: 'Cantidad', value: 'quantity' },
  { label: 'Tiempo', value: 'time' },
] as const;

const kindOptions = [...KIND_OPTIONS];
const kindFilterOptions = [{ label: 'Todos los tipos', value: '' }, ...KIND_OPTIONS];
const activeFilterOptions = [
  { label: 'Solo activos', value: 'false' },
  { label: 'Incluir inactivos', value: 'true' },
];


const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const activeTab = ref<CatalogTab>('units');
const activeTabModel = computed({
  get: () => activeTab.value as string,
  set: (value: string) => {
    activeTab.value = value as CatalogTab;
  },
});
const isLoading = ref(false);
const error = ref<string | null>(null);

const units = ref<Unit[]>([]);
const taxRates = ref<TaxRate[]>([]);
const currencies = ref<Currency[]>([]);

const unitFilters = reactive({
  search: '',
  kind: '' as '' | UnitKind,
  includeInactive: 'false',
});
const taxFilters = reactive({
  search: '',
  includeInactive: 'false',
});

let unitTimer: ReturnType<typeof setTimeout> | undefined;
let taxTimer: ReturnType<typeof setTimeout> | undefined;

function kindLabel(kind: UnitKind): string {
  return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 }).format(rate);
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    if (activeTab.value === 'units') {
      units.value = await catalogService.listUnits({
        search: unitFilters.search || undefined,
        kind: unitFilters.kind || undefined,
        includeInactive: unitFilters.includeInactive === 'true',
      });
    } else if (activeTab.value === 'taxes') {
      taxRates.value = await catalogService.listTaxRates({
        search: taxFilters.search || undefined,
        includeInactive: taxFilters.includeInactive === 'true',
      });
    } else if (activeTab.value === 'currencies') {
      currencies.value = await catalogService.getCurrencies();
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar el catálogo');
  } finally {
    isLoading.value = false;
  }
}

watch(activeTab, load);
watch(
  () => unitFilters.search,
  () => {
    if (unitTimer) clearTimeout(unitTimer);
    unitTimer = setTimeout(load, 300);
  },
);
watch(
  () => [unitFilters.kind, unitFilters.includeInactive],
  load,
);
watch(
  () => taxFilters.search,
  () => {
    if (taxTimer) clearTimeout(taxTimer);
    taxTimer = setTimeout(load, 300);
  },
);
watch(() => taxFilters.includeInactive, load);

// --- Unidad ---
const isUnitOpen = ref(false);
const editingUnit = ref<Unit | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const unitForm = reactive({
  code: '',
  name: '',
  kind: 'length' as UnitKind,
  precision: '2',
  isActive: true,
});

function openUnitCreate(): void {
  editingUnit.value = null;
  unitForm.code = '';
  unitForm.name = '';
  unitForm.kind = 'length';
  unitForm.precision = '2';
  unitForm.isActive = true;
  formError.value = null;
  isUnitOpen.value = true;
}

function openUnitEdit(unit: Unit): void {
  editingUnit.value = unit;
  unitForm.code = unit.code;
  unitForm.name = unit.name;
  unitForm.kind = unit.kind;
  unitForm.precision = String(unit.precision);
  unitForm.isActive = unit.is_active;
  formError.value = null;
  isUnitOpen.value = true;
}

async function saveUnit(): Promise<void> {
  if (!unitForm.code.trim() || !unitForm.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    if (editingUnit.value) {
      await catalogService.updateUnit(editingUnit.value.id, {
        code: unitForm.code.trim(),
        name: unitForm.name.trim(),
        kind: unitForm.kind,
        precision: Number(unitForm.precision),
        isActive: unitForm.isActive,
      });
      toast.success('Unidad actualizada');
    } else {
      await catalogService.createUnit({
        code: unitForm.code.trim(),
        name: unitForm.name.trim(),
        kind: unitForm.kind,
        precision: Number(unitForm.precision),
      });
      toast.success('Unidad creada');
    }
    isUnitOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar la unidad');
  } finally {
    isSaving.value = false;
  }
}

// --- Conversiones ---
const isConversionsOpen = ref(false);
const conversionUnit = ref<Unit | null>(null);
const conversionCandidates = ref<Unit[]>([]);
const conversions = ref<UnitConversion[]>([]);
const newConversion = reactive({ toUnitId: '', factor: '1' });

const conversionTargetOptions = computed(() => {
  if (!conversionUnit.value) return [];
  return conversionCandidates.value
    .filter(
      (unit) =>
        unit.id !== conversionUnit.value!.id &&
        unit.kind === conversionUnit.value!.kind &&
        unit.is_active,
    )
    .map((unit) => ({ label: `${unit.code} · ${unit.name}`, value: unit.id }));
});

async function openConversions(unit: Unit): Promise<void> {
  conversionUnit.value = unit;
  newConversion.toUnitId = '';
  newConversion.factor = '1';
  isConversionsOpen.value = true;
  try {
    const [unitConversions, candidates] = await Promise.all([
      catalogService.listConversions(unit.id),
      catalogService.listUnits({ kind: unit.kind }),
    ]);
    conversions.value = unitConversions;
    conversionCandidates.value = candidates;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar las conversiones'));
  }
}

async function addConversion(): Promise<void> {
  if (!conversionUnit.value || !newConversion.toUnitId || !newConversion.factor) return;
  try {
    await catalogService.addConversion(conversionUnit.value.id, {
      toUnitId: newConversion.toUnitId,
      factor: Number(newConversion.factor),
    });
    newConversion.toUnitId = '';
    newConversion.factor = '1';
    conversions.value = await catalogService.listConversions(conversionUnit.value.id);
    toast.success('Conversión agregada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar la conversión'));
  }
}

async function deleteConversion(conversionId: string): Promise<void> {
  if (!conversionUnit.value) return;
  try {
    await catalogService.deleteConversion(conversionUnit.value.id, conversionId);
    conversions.value = await catalogService.listConversions(conversionUnit.value.id);
    toast.success('Conversión eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la conversión'));
  }
}

// --- Impuesto ---
const isTaxOpen = ref(false);
const editingTax = ref<TaxRate | null>(null);
const taxForm = reactive({
  code: '',
  name: '',
  rate: '19',
  countryCode: '',
  isActive: true,
});

function openTaxCreate(): void {
  editingTax.value = null;
  taxForm.code = '';
  taxForm.name = '';
  taxForm.rate = '19';
  taxForm.countryCode = '';
  taxForm.isActive = true;
  formError.value = null;
  isTaxOpen.value = true;
}

function openTaxEdit(tax: TaxRate): void {
  editingTax.value = tax;
  taxForm.code = tax.code;
  taxForm.name = tax.name;
  taxForm.rate = String(tax.rate);
  taxForm.countryCode = tax.country_code ?? '';
  taxForm.isActive = tax.is_active;
  formError.value = null;
  isTaxOpen.value = true;
}

async function saveTax(): Promise<void> {
  if (!taxForm.code.trim() || !taxForm.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    if (editingTax.value) {
      await catalogService.updateTaxRate(editingTax.value.id, {
        code: taxForm.code.trim(),
        name: taxForm.name.trim(),
        rate: Number(taxForm.rate),
        countryCode: taxForm.countryCode.trim() || undefined,
        isActive: taxForm.isActive,
      });
      toast.success('Impuesto actualizado');
    } else {
      await catalogService.createTaxRate({
        code: taxForm.code.trim(),
        name: taxForm.name.trim(),
        rate: Number(taxForm.rate),
        countryCode: taxForm.countryCode.trim() || undefined,
      });
      toast.success('Impuesto creado');
    }
    isTaxOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el impuesto');
  } finally {
    isSaving.value = false;
  }
}

// --- Eliminar ---
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const deleteTarget = ref<{ kind: DeleteKind; id: string; name: string } | null>(null);

function confirmDelete(kind: DeleteKind, id: string, name: string): void {
  deleteTarget.value = { kind, id, name };
  isDeleteOpen.value = true;
}

async function removeTarget(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    if (deleteTarget.value.kind === 'unit') {
      await catalogService.deleteUnit(deleteTarget.value.id);
    } else {
      await catalogService.deleteTaxRate(deleteTarget.value.id);
    }
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Registro eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el registro'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => {
  if (unitTimer) clearTimeout(unitTimer);
  if (taxTimer) clearTimeout(taxTimer);
});
</script>

<style scoped>
.catalog-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.catalog-tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.catalog-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 220px) minmax(150px, 200px);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.catalog-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.catalog-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.catalog-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.catalog-row + .catalog-row {
  border-top: 1px solid var(--border);
}

.catalog-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 32px;
  padding: 0 var(--space-2);
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--primary);
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.catalog-copy {
  min-width: 0;
  flex: 1;
}

.catalog-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.catalog-title-row h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.catalog-meta {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.catalog-actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.catalog-empty {
  padding: var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.danger-action {
  color: var(--color-danger);
}

.inline-form {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

@media (max-width: 800px) {
  .catalog-toolbar {
    grid-template-columns: 1fr;
  }

  .catalog-row {
    flex-wrap: wrap;
  }

  .catalog-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(44px + var(--space-3));
  }
}
</style>
