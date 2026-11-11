<template>
  <UiCard>
    <div class="tab-actions">
      <UiButton
        v-if="!entitlementsStore.isReadOnly"
        v-permission="Permissions.CATALOG.CREATE"
        width="auto"
        @click="openCreate"
      >
        <IconPlus :size="16" /> Nueva lista
      </UiButton>
    </div>

    <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

    <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
      <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
    </div>

    <ul v-else class="catalog-list">
      <li v-for="list in priceLists" :key="list.id" class="catalog-row">
        <span class="catalog-badge">{{ list.code }}</span>
        <div class="catalog-copy">
          <div class="catalog-title-row">
            <h3>{{ list.name }}</h3>
            <UiBadge v-if="list.is_default" label="Predeterminada" variant="success" size="sm" />
            <UiBadge v-if="!list.is_active" label="Inactiva" variant="warning" size="sm" />
            <UiBadge :label="list.currency_code" size="sm" />
          </div>
          <p class="catalog-meta">
            {{ list.prices_count }} precios
            <span v-if="list.valid_from"> · desde {{ list.valid_from }}</span>
            <span v-if="list.valid_to"> · hasta {{ list.valid_to }}</span>
          </p>
        </div>
        <div class="catalog-actions">
          <UiButton size="sm" variant="ghost" width="auto" @click="openPrices(list)">
            Precios
          </UiButton>
          <template v-if="!entitlementsStore.isReadOnly">
            <UiButton
              v-permission="Permissions.CATALOG.UPDATE"
              size="sm"
              variant="ghost"
              width="auto"
              @click="openEdit(list)"
            >
              Editar
            </UiButton>
            <UiButton
              v-permission="Permissions.CATALOG.DELETE"
              size="sm"
              variant="ghost"
              width="auto"
              class="danger-action"
              @click="confirmDelete(list)"
            >
              Eliminar
            </UiButton>
          </template>
        </div>
      </li>
      <li v-if="priceLists.length === 0" class="catalog-empty">No hay listas de precios.</li>
    </ul>
  </UiCard>

  <UiFormModal
    v-model="isFormOpen"
    :title="editing ? 'Editar lista de precios' : 'Nueva lista de precios'"
    :submit-label="editing ? 'Guardar' : 'Crear lista'"
    :loading="isSaving"
    @submit="save"
  >
    <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
    <div class="form-grid">
      <UiInput v-model="form.code" label="Código" required />
      <UiInput v-model="form.name" label="Nombre" required />
      <UiSelect v-model="form.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
      <UiSwitch v-model="form.isDefault" label="Predeterminada" />
      <UiInput v-model="form.validFrom" label="Vigente desde" type="date" />
      <UiInput v-model="form.validTo" label="Vigente hasta" type="date" />
      <UiSwitch v-if="editing" v-model="form.isActive" label="Activa" />
    </div>
  </UiFormModal>

  <UiFormModal
    v-model="isPricesOpen"
    :title="priceList ? `Precios · ${priceList.name}` : 'Precios'"
    size="large"
    :hide-footer="true"
  >
    <div v-if="!entitlementsStore.isReadOnly" v-permission="Permissions.CATALOG.CREATE" class="inline-form">
      <UiSelect v-model="newPrice.itemId" :options="itemOptions" placeholder="Ítem" :clearable="false" />
      <UiInput v-model="newPrice.price" label="Precio" type="number" />
      <UiInput v-model="newPrice.minQuantity" label="Cantidad mínima" type="number" />
      <UiButton
        size="sm"
        variant="outline"
        width="auto"
        :disabled="!newPrice.itemId || !newPrice.price"
        @click="addPrice"
      >
        Agregar
      </UiButton>
    </div>

    <ul class="catalog-list">
      <li v-for="price in prices" :key="price.id" class="catalog-row">
        <div class="catalog-copy">
          <h3>{{ price.item_sku }} · {{ price.item_name }}</h3>
          <p class="catalog-meta">
            {{ formatMoney(price.price, priceList?.currency_code ?? 'COP') }}
            · desde {{ price.min_quantity }} unidades
          </p>
        </div>
        <UiButton
          v-if="!entitlementsStore.isReadOnly"
          v-permission="Permissions.CATALOG.DELETE"
          size="sm"
          variant="ghost"
          width="auto"
          class="danger-action"
          @click="deletePrice(price.id)"
        >
          Quitar
        </UiButton>
      </li>
      <li v-if="prices.length === 0" class="catalog-empty">Sin precios registrados.</li>
    </ul>
  </UiFormModal>

  <UiConfirmDialog
    v-model="isDeleteOpen"
    title="Eliminar lista de precios"
    variant="danger"
    confirm-label="Eliminar"
    :loading="isDeleting"
    @confirm="remove"
  >
    ¿Eliminar <strong>{{ deleteTarget?.name }}</strong> y sus precios?
  </UiConfirmDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import { IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { catalogService } from '@/services/catalog.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type { CatalogItem, Currency, ItemPrice, PriceList } from '@/types/catalog';

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const priceLists = ref<PriceList[]>([]);
const items = ref<CatalogItem[]>([]);
const currencies = ref<Currency[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const itemOptions = computed(() =>
  items.value.map((item) => ({ label: `${item.sku} · ${item.name}`, value: item.id })),
);
const currencyOptions = computed(() =>
  currencies.value.map((currency) => ({ label: `${currency.code} · ${currency.name}`, value: currency.code })),
);

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
    const [lists, itemResponse, currencyData] = await Promise.all([
      catalogService.listPriceLists(),
      catalogService.listItems({ limit: 100 }),
      catalogService.getCurrencies(),
    ]);
    priceLists.value = lists;
    items.value = itemResponse.data;
    currencies.value = currencyData;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar las listas de precios');
  } finally {
    isLoading.value = false;
  }
}

const isFormOpen = ref(false);
const editing = ref<PriceList | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({
  code: '',
  name: '',
  currencyCode: 'COP',
  isDefault: false,
  validFrom: '',
  validTo: '',
  isActive: true,
});

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    code: '',
    name: '',
    currencyCode: currencies.value.find((currency) => currency.code === 'COP')?.code ?? currencies.value[0]?.code ?? 'COP',
    isDefault: false,
    validFrom: '',
    validTo: '',
    isActive: true,
  });
  formError.value = null;
  isFormOpen.value = true;
}

function openEdit(list: PriceList): void {
  editing.value = list;
  Object.assign(form, {
    code: list.code,
    name: list.name,
    currencyCode: list.currency_code,
    isDefault: list.is_default,
    validFrom: list.valid_from ?? '',
    validTo: list.valid_to ?? '',
    isActive: list.is_active,
  });
  formError.value = null;
  isFormOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.code.trim() || !form.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    currencyCode: form.currencyCode,
    isDefault: form.isDefault,
    validFrom: form.validFrom || null,
    validTo: form.validTo || null,
    isActive: form.isActive,
  };
  try {
    if (editing.value) {
      await catalogService.updatePriceList(editing.value.id, payload);
      toast.success('Lista actualizada');
    } else {
      await catalogService.createPriceList(payload);
      toast.success('Lista creada');
    }
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar la lista');
  } finally {
    isSaving.value = false;
  }
}

const isPricesOpen = ref(false);
const priceList = ref<PriceList | null>(null);
const prices = ref<ItemPrice[]>([]);
const newPrice = reactive({ itemId: '', price: '0', minQuantity: '1' });

async function openPrices(list: PriceList): Promise<void> {
  priceList.value = list;
  newPrice.itemId = '';
  newPrice.price = '0';
  newPrice.minQuantity = '1';
  isPricesOpen.value = true;
  try {
    prices.value = await catalogService.listItemPrices(list.id);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar los precios'));
  }
}

async function addPrice(): Promise<void> {
  if (!priceList.value || !newPrice.itemId) return;
  try {
    await catalogService.createItemPrice(priceList.value.id, {
      itemId: newPrice.itemId,
      price: Number(newPrice.price),
      minQuantity: Number(newPrice.minQuantity),
    });
    prices.value = await catalogService.listItemPrices(priceList.value.id);
    newPrice.itemId = '';
    newPrice.price = '0';
    newPrice.minQuantity = '1';
    toast.success('Precio agregado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el precio'));
  }
}

async function deletePrice(priceId: string): Promise<void> {
  if (!priceList.value) return;
  try {
    await catalogService.deleteItemPrice(priceList.value.id, priceId);
    prices.value = await catalogService.listItemPrices(priceList.value.id);
    toast.success('Precio eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el precio'));
  }
}

const isDeleteOpen = ref(false);
const deleteTarget = ref<PriceList | null>(null);
const isDeleting = ref(false);

function confirmDelete(list: PriceList): void {
  deleteTarget.value = list;
  isDeleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await catalogService.deletePriceList(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Lista eliminada');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la lista'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
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
  min-width: 52px;
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
</style>
