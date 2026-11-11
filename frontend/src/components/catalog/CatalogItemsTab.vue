<template>
  <UiCard>
    <div class="catalog-toolbar">
      <UiSearchInput v-model="filters.search" placeholder="Buscar por SKU, nombre..." aria-label="Buscar ítems" />
      <UiSelect v-model="filters.categoryId" :options="categoryFilterOptions" aria-label="Filtrar por categoría" />
      <UiSelect v-model="filters.itemType" :options="typeFilterOptions" aria-label="Filtrar por tipo" />
      <UiSelect v-model="filters.status" :options="statusFilterOptions" :clearable="false" aria-label="Filtrar por estado" />
    </div>

    <div class="tab-actions">
      <UiButton
        v-if="!entitlementsStore.isReadOnly"
        v-permission="Permissions.CATALOG.CREATE"
        width="auto"
        @click="openCreate"
      >
        <IconPlus :size="16" /> Nuevo ítem
      </UiButton>
    </div>

    <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

    <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
      <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
    </div>

    <ul v-else class="catalog-list">
      <li v-for="item in items" :key="item.id" class="catalog-row">
        <span class="catalog-badge">{{ item.sku }}</span>
        <div class="catalog-copy">
          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <UiBadge :label="itemTypeLabel(item.item_type)" :variant="item.item_type === 'product' ? 'info' : 'neutral'" size="sm" />
            <UiBadge v-if="item.category_name" :label="item.category_name" size="sm" />
            <UiBadge v-if="item.status === 'inactive'" label="Inactivo" variant="warning" size="sm" />
          </div>
          <p class="catalog-meta">
            {{ item.unit_code }} · {{ formatMoney(item.price, item.currency_code) }}
            <span v-if="item.tax_rate !== null"> · {{ item.tax_name }} {{ item.tax_rate }}%</span>
            <span v-if="item.is_stockable"> · Inventariable</span>
          </p>
        </div>
        <div v-if="!entitlementsStore.isReadOnly" class="catalog-actions">
          <UiButton
            v-permission="Permissions.CATALOG.UPDATE"
            size="sm"
            variant="ghost"
            width="auto"
            @click="openEdit(item)"
          >
            Editar
          </UiButton>
          <UiButton
            v-permission="Permissions.CATALOG.DELETE"
            size="sm"
            variant="ghost"
            width="auto"
            class="danger-action"
            @click="confirmDelete(item)"
          >
            Eliminar
          </UiButton>
        </div>
      </li>
      <li v-if="items.length === 0" class="catalog-empty">No hay ítems para este filtro.</li>
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

  <UiFormModal
    v-model="isFormOpen"
    :title="editing ? 'Editar ítem' : 'Nuevo ítem'"
    :submit-label="editing ? 'Guardar' : 'Crear ítem'"
    :loading="isSaving"
    size="large"
    @submit="save"
  >
    <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
    <div class="form-grid">
      <UiInput v-model="form.sku" label="SKU" required />
      <UiInput v-model="form.name" label="Nombre" required />
      <UiSelect v-model="form.itemType" label="Tipo" :options="itemTypeOptions" :clearable="false" />
      <UiSelect v-model="form.categoryId" label="Categoría" :options="categoryOptions" />
      <UiSelect v-model="form.unitId" label="Unidad" :options="unitOptions" :clearable="false" />
      <UiSelect v-model="form.taxRateId" label="Impuesto" :options="taxOptions" />
      <UiInput v-model="form.cost" label="Costo" type="number" />
      <UiInput v-model="form.price" label="Precio" type="number" />
      <UiSelect v-model="form.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
      <UiSwitch v-model="form.isStockable" label="Inventariable" />
      <UiSelect v-if="editing" v-model="form.status" label="Estado" :options="statusOptions" :clearable="false" />
      <UiTextarea v-model="form.description" label="Descripción" class="span-2" />
    </div>
  </UiFormModal>

  <UiConfirmDialog
    v-model="isDeleteOpen"
    title="Eliminar ítem"
    variant="danger"
    confirm-label="Eliminar"
    :loading="isDeleting"
    @confirm="remove"
  >
    ¿Eliminar <strong>{{ deleteTarget?.name }}</strong> del catálogo?
  </UiConfirmDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiTextarea from '@/components/ui/UiTextarea.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiPagination from '@/components/ui/UiPagination.vue';
import { IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { catalogService } from '@/services/catalog.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type {
  CatalogItem,
  Currency,
  ItemCategory,
  ItemStatus,
  ItemType,
  TaxRate,
  Unit,
} from '@/types/catalog';

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const items = ref<CatalogItem[]>([]);
const categories = ref<ItemCategory[]>([]);
const units = ref<Unit[]>([]);
const taxes = ref<TaxRate[]>([]);
const currencies = ref<Currency[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const error = ref<string | null>(null);

const filters = reactive({
  search: '',
  categoryId: '',
  itemType: '' as '' | ItemType,
  status: '' as '' | ItemStatus,
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

const categoryFilterOptions = computed(() => [
  { label: 'Todas las categorías', value: '' },
  ...categories.value.map((category) => ({ label: category.name, value: category.id })),
]);
const categoryOptions = computed(() => [
  { label: 'Sin categoría', value: '' },
  ...categories.value.map((category) => ({ label: category.name, value: category.id })),
]);
const unitOptions = computed(() =>
  units.value.map((unit) => ({ label: `${unit.code} · ${unit.name}`, value: unit.id })),
);
const taxOptions = computed(() => [
  { label: 'Sin impuesto', value: '' },
  ...taxes.value.map((tax) => ({ label: `${tax.name} (${tax.rate}%)`, value: tax.id })),
]);
const currencyOptions = computed(() =>
  currencies.value.map((currency) => ({ label: `${currency.code} · ${currency.name}`, value: currency.code })),
);
const itemTypeOptions = [
  { label: 'Producto', value: 'product' },
  { label: 'Servicio', value: 'service' },
];
const typeFilterOptions = [{ label: 'Todos los tipos', value: '' }, ...itemTypeOptions];
const statusOptions = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' },
];
const statusFilterOptions = [{ label: 'Todos los estados', value: '' }, ...statusOptions];

function itemTypeLabel(type: ItemType): string {
  return type === 'product' ? 'Producto' : 'Servicio';
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await catalogService.listItems({
      search: filters.search || undefined,
      categoryId: filters.categoryId || undefined,
      itemType: filters.itemType || undefined,
      status: filters.status || undefined,
      page: page.value,
      limit: limit.value,
    });
    items.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar los ítems');
  } finally {
    isLoading.value = false;
  }
}

async function loadLookups(): Promise<void> {
  const [categoryData, unitData, taxData, currencyData] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listUnits(),
    catalogService.listTaxRates(),
    catalogService.getCurrencies(),
  ]);
  categories.value = categoryData;
  units.value = unitData;
  taxes.value = taxData;
  currencies.value = currencyData;
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
  () => [filters.categoryId, filters.itemType, filters.status],
  () => {
    page.value = 1;
    void load();
  },
);
watch([page, limit], () => void load());

// --- Formulario ---
const isFormOpen = ref(false);
const editing = ref<CatalogItem | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({
  sku: '',
  name: '',
  description: '',
  itemType: 'product' as ItemType,
  categoryId: '',
  unitId: '',
  taxRateId: '',
  cost: '0',
  price: '0',
  currencyCode: 'COP',
  isStockable: true,
  status: 'active' as ItemStatus,
});

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    sku: '',
    name: '',
    description: '',
    itemType: 'product',
    categoryId: '',
    unitId: units.value.find((unit) => unit.is_global)?.id ?? units.value[0]?.id ?? '',
    taxRateId: '',
    cost: '0',
    price: '0',
    currencyCode: currencies.value.find((currency) => currency.code === 'COP')?.code ?? currencies.value[0]?.code ?? 'COP',
    isStockable: true,
    status: 'active',
  });
  formError.value = null;
  isFormOpen.value = true;
}

function openEdit(item: CatalogItem): void {
  editing.value = item;
  Object.assign(form, {
    sku: item.sku,
    name: item.name,
    description: item.description ?? '',
    itemType: item.item_type,
    categoryId: item.category_id ?? '',
    unitId: item.unit_id,
    taxRateId: item.tax_rate_id ?? '',
    cost: String(item.cost),
    price: String(item.price),
    currencyCode: item.currency_code,
    isStockable: item.is_stockable,
    status: item.status,
  });
  formError.value = null;
  isFormOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.sku.trim() || !form.name.trim() || !form.unitId) {
    formError.value = 'SKU, nombre y unidad son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  const payload = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    itemType: form.itemType,
    categoryId: form.categoryId || null,
    unitId: form.unitId,
    taxRateId: form.taxRateId || null,
    cost: Number(form.cost),
    price: Number(form.price),
    currencyCode: form.currencyCode,
    isStockable: form.isStockable,
    status: form.status,
  };
  try {
    if (editing.value) {
      await catalogService.updateItem(editing.value.id, payload);
      toast.success('Ítem actualizado');
    } else {
      await catalogService.createItem(payload);
      toast.success('Ítem creado');
    }
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el ítem');
  } finally {
    isSaving.value = false;
  }
}

// --- Eliminar ---
const isDeleteOpen = ref(false);
const deleteTarget = ref<CatalogItem | null>(null);
const isDeleting = ref(false);

function confirmDelete(item: CatalogItem): void {
  deleteTarget.value = item;
  isDeleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await catalogService.deleteItem(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Ítem eliminado');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el ítem'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([load(), loadLookups()]);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.catalog-toolbar {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) repeat(3, minmax(140px, 190px));
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
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
  min-width: 58px;
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

@media (max-width: 900px) {
  .catalog-toolbar {
    grid-template-columns: 1fr;
  }

  .catalog-row {
    flex-wrap: wrap;
  }

  .catalog-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(58px + var(--space-3));
  }
}
</style>
