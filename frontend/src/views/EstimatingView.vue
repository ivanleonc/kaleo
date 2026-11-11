<template>
  <AuthenticatedLayout>
    <div class="estimating-page">
      <UiPageHeader
        title="Estimación"
        subtitle="Recursos, bases de APUs y análisis de precios unitarios."
      >
        <template #actions>
          <UiTableColumnMenu v-if="activeTab === 'resources'" :table="resourceTable" />
          <UiTableColumnMenu v-else-if="activeTab === 'bases'" :table="apuBaseTable" />
          <UiTableColumnMenu v-else :table="apuTable" />
          <UiButton
            v-if="activeTab === 'resources'"
            v-permission="Permissions.ESTIMATING.CREATE"
            width="auto"
            @click="openResourceCreate"
          >
            <IconPlus :size="16" /> Nuevo recurso
          </UiButton>
          <UiButton
            v-if="activeTab === 'bases'"
            v-permission="Permissions.ESTIMATING.CREATE"
            width="auto"
            @click="openBaseCreate"
          >
            <IconPlus :size="16" /> Nueva base
          </UiButton>
          <UiButton
            v-if="activeTab === 'apus'"
            v-permission="Permissions.ESTIMATING.CREATE"
            variant="outline"
            width="auto"
            @click="openImport"
          >
            <IconFileImport :size="16" /> Importar
          </UiButton>
          <UiButton
            v-if="activeTab === 'apus'"
            v-permission="Permissions.ESTIMATING.CREATE"
            width="auto"
            @click="openApuCreate"
          >
            <IconPlus :size="16" /> Nuevo APU
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <UiTabs
        v-model="activeTabModel"
        :tabs="TABS"
        group-label="Secciones de estimación"
        variant="pills"
        panel-id-prefix="estimating"
      />

      <UiCard
        v-if="activeTab === 'resources'"
        id="estimating-panel-resources"
        role="tabpanel"
        aria-labelledby="estimating-tab-resources"
      >
        <UiTableFilters
          v-model="resourceFilterValues"
          :filters="resourceFilterDefs"
          class="estimating-filters"
        />
        <ResourceTable
          :table="resourceTable"
          :loading="isLoading"
          :error="error"
          error-title="No pudimos cargar los recursos"
          :empty-title="hasResourceFilters ? 'Sin recursos que coincidan' : 'Sin recursos'"
          :empty-description="
            hasResourceFilters
              ? 'Ajusta la búsqueda o el filtro de tipo.'
              : 'Crea el primer recurso de tu catálogo de estimación.'
          "
          @retry="load"
          @edit="openResourceEdit"
          @delete="confirmResourceDelete"
        >
          <template #empty-action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.ESTIMATING.CREATE"
              width="auto"
              @click="openResourceCreate"
            >
              <IconPlus :size="16" /> Nuevo recurso
            </UiButton>
          </template>
        </ResourceTable>
      </UiCard>

      <UiCard
        v-else-if="activeTab === 'bases'"
        id="estimating-panel-bases"
        role="tabpanel"
        aria-labelledby="estimating-tab-bases"
      >
        <ApuBaseTable
          :table="apuBaseTable"
          :loading="isLoading"
          :error="error"
          error-title="No pudimos cargar las bases"
          empty-title="Sin bases de APUs"
          empty-description="Una base agrupa tus análisis de precios unitarios para reutilizarlos entre proyectos."
          @retry="load"
          @edit="openBaseEdit"
          @delete="confirmBaseDelete"
        >
          <template #empty-action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.ESTIMATING.CREATE"
              width="auto"
              @click="openBaseCreate"
            >
              <IconPlus :size="16" /> Nueva base
            </UiButton>
          </template>
        </ApuBaseTable>
      </UiCard>

      <UiCard
        v-else
        id="estimating-panel-apus"
        role="tabpanel"
        aria-labelledby="estimating-tab-apus"
      >
        <UiTableFilters
          v-model="apuFilterValues"
          :filters="apuFilterDefs"
          class="estimating-filters"
        />
        <ApuTable
          :table="apuTable"
          :loading="isLoading"
          :error="error"
          error-title="No pudimos cargar los APUs"
          :empty-title="hasApuFilters ? 'Sin APUs que coincidan' : 'Sin APUs'"
          :empty-description="
            hasApuFilters
              ? 'Ajusta la búsqueda o el filtro de base.'
              : 'Crea un APU dentro de una base para calcular precios unitarios a partir de insumos.'
          "
          @retry="load"
          @lines="openApuLines"
          @edit="openApuEdit"
          @delete="confirmApuDelete"
        >
          <template #empty-action>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.ESTIMATING.CREATE"
              width="auto"
              @click="openApuCreate"
            >
              <IconPlus :size="16" /> Nuevo APU
            </UiButton>
          </template>
        </ApuTable>
      </UiCard>
    </div>

    <!-- Recurso -->
    <UiFormModal
      v-model="isResourceOpen"
      :title="editingResource ? 'Editar recurso' : 'Nuevo recurso'"
      :description="
        editingResource
          ? `Actualiza ${editingResource.code} · ${editingResource.name}.`
          : 'Los recursos alimentan los APUs y conservan su costo al momento de usarse.'
      "
      :submit-label="editingResource ? 'Guardar' : 'Crear recurso'"
      :loading="isSaving"
      size="large"
      footer-hint="El costo base se congela en los insumos de APU ya creados; los cambios aplican a nuevos usos."
      :dirty="isResourceDirty"
      :confirm-on-dirty="true"
      @submit="saveResource"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection
        title="Identificación"
        description="Código, nombre y tipo con el que aparecerá en los APUs."
      >
        <div class="form-grid">
          <UiSelect v-model="resourceForm.resourceType" label="Tipo" :options="resourceTypeOptions" :clearable="false" />
          <UiInput v-model="resourceForm.code" label="Código" required hint="Identificador único dentro de la empresa." />
          <UiInput v-model="resourceForm.name" label="Nombre" required class="span-2" />
          <UiInput v-model="resourceForm.description" label="Descripción" class="span-2" />
        </div>
      </UiFormSection>
      <UiFormSection title="Costo" description="Valor unitario de referencia y moneda del recurso.">
        <div class="form-grid">
          <UiSelect v-model="resourceForm.unitId" label="Unidad" :options="unitOptions" :clearable="false" />
          <UiInput v-model="resourceForm.baseCost" label="Costo base" type="number" hint="Se usa como costo unitario al agregar el insumo a un APU." />
          <UiSelect v-model="resourceForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Base -->
    <UiFormModal
      v-model="isBaseOpen"
      :title="editingBase ? 'Editar base' : 'Nueva base de APUs'"
      :description="
        editingBase
          ? `Actualiza ${editingBase.code} · ${editingBase.name}.`
          : 'Una base agrupa APUs reutilizables entre proyectos y presupuestos.'
      "
      :submit-label="editingBase ? 'Guardar' : 'Crear base'"
      :loading="isSaving"
      footer-hint="La base debe estar activa para poder importar APUs o agregarlos a un presupuesto."
      :dirty="isBaseDirty"
      :confirm-on-dirty="true"
      @submit="saveBase"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Identificación" description="Código y nombre visible en el selector de APUs.">
        <div class="form-grid">
          <UiInput v-model="baseForm.code" label="Código" required hint="Ej. BASE-2026." />
          <UiInput v-model="baseForm.name" label="Nombre" required />
        </div>
      </UiFormSection>
      <UiFormSection title="Origen" description="Fuente de precios y alcance de la base.">
        <div class="form-grid">
          <UiInput v-model="baseForm.source" label="Fuente / proveedor" placeholder="Propia, revista, proveedor…" />
          <UiInput v-model="baseForm.description" label="Descripción" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- APU -->
    <UiFormModal
      v-model="isApuOpen"
      :title="editingApu ? 'Editar APU' : 'Nuevo APU'"
      :description="
        editingApu
          ? `Actualiza ${editingApu.code} · ${editingApu.name}.`
          : 'Un APU calcula el precio unitario de una actividad a partir de sus insumos.'
      "
      :submit-label="editingApu ? 'Guardar' : 'Crear APU'"
      :loading="isSaving"
      footer-hint="La unidad de salida debe coincidir con la unidad de la actividad para aplicar takeoff."
      :dirty="isApuDirty"
      :confirm-on-dirty="true"
      @submit="saveApu"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Identificación" description="Base, código y nombre del análisis de precio unitario.">
        <div class="form-grid">
          <UiSelect v-model="apuForm.baseId" label="Base" :options="baseOptions" :clearable="false" />
          <UiInput v-model="apuForm.code" label="Código" required hint="Ej. APU-MAMP-001." />
          <UiInput v-model="apuForm.name" label="Nombre" required class="span-2" />
          <UiInput v-model="apuForm.description" label="Descripción" class="span-2" />
        </div>
      </UiFormSection>
      <UiFormSection title="Unidad de salida" description="Unidad en la que se mide la actividad terminada.">
        <div class="form-grid">
          <UiSelect
            v-model="apuForm.unitId"
            label="Unidad de salida"
            :options="unitOptions"
            :clearable="false"
            hint="Ej. m2, m3, un. Define cómo se compara con las actividades del presupuesto."
          />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Insumos del APU -->
    <UiFormModal
      v-model="isLinesOpen"
      :title="apuDetail ? `${apuDetail.code} · ${apuDetail.name}` : 'Insumos del APU'"
      description="Costo de la línea = cantidad × (1 + desperdicio %) × rendimiento × costo unitario del insumo."
      size="large"
      :hide-footer="true"
    >
      <div v-if="isLoadingDetail" class="estimating-loading" aria-hidden="true">
        <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
      </div>
      <template v-else-if="apuDetail">
        <div class="apu-summary">
          <div>
            <p class="estimating-meta">{{ apuDetail.base_name }} · {{ apuDetail.lines_count }} insumos</p>
            <p class="estimating-meta">Costo unitario: {{ formatMoney(apuDetail.unit_cost, apuDetail.lines[0]?.currency_code ?? 'COP') }}</p>
          </div>
          <div class="estimating-actions">
            <UiButton
              v-if="apuDetail.current_version_status !== 'approved' && !entitlementsStore.isReadOnly"
              v-permission="Permissions.ESTIMATING.UPDATE"
              size="sm"
              variant="outline"
              width="auto"
              :loading="isSaving"
              @click="approveApu"
            >
              Aprobar APU
            </UiButton>
            <UiButton
              v-if="!entitlementsStore.isReadOnly"
              v-permission="Permissions.ESTIMATING.UPDATE"
              size="sm"
              variant="outline"
              width="auto"
              :loading="isSaving"
              @click="newApuVersion"
            >
              Nueva versión
            </UiButton>
          </div>
        </div>

        <div v-if="apuDetail.lines.length > 0" class="line-table-scroll">
          <div class="line-head" aria-hidden="true">
            <span>Insumo</span>
            <span>Unidad</span>
            <span>Cantidad</span>
            <span>Desperdicio %</span>
            <span>Rendimiento</span>
            <span>Costo unit.</span>
            <span>Parcial</span>
            <span></span>
          </div>
          <div class="line-groups">
          <section v-for="group in lineGroups" :key="group.type" class="line-group">
            <h4>{{ group.label }} <span>{{ formatMoney(group.total, apuDetail.lines[0]?.currency_code ?? 'COP') }}</span></h4>
            <div v-for="line in group.lines" :key="line.id" class="line-row">
              <span>{{ line.resource_code }} · {{ line.resource_name }}</span>
              <span>{{ line.unit_code }}</span>
              <input
                v-if="canEditLines"
                v-model.number="line.quantity"
                type="number"
                min="0"
                step="0.000001"
                class="line-input"
                aria-label="Cantidad"
                @change="saveLine(line.id, { quantity: Number(line.quantity) })"
              />
              <span v-else>{{ line.quantity }}</span>
              <input
                v-if="canEditLines"
                v-model.number="line.waste_pct"
                type="number"
                min="0"
                step="0.01"
                class="line-input"
                aria-label="Desperdicio %"
                @change="saveLine(line.id, { wastePct: Number(line.waste_pct) })"
              />
              <span v-else>{{ line.waste_pct }}%</span>
              <input
                v-if="canEditLines"
                v-model.number="line.performance"
                type="number"
                min="0.000001"
                step="0.000001"
                class="line-input"
                aria-label="Rendimiento"
                @change="saveLine(line.id, { performance: Number(line.performance) })"
              />
              <span v-else>{{ line.performance }}</span>
              <span>{{ formatMoney(line.unit_cost_snapshot, line.currency_code) }}</span>
              <span>{{ formatMoney(line.partial_amount, line.currency_code) }}</span>
              <span class="line-actions">
                <UiButton
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openPrices(line)"
                >
                  Precios
                </UiButton>
                <UiButton
                  v-if="canEditLines"
                  v-permission="Permissions.ESTIMATING.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="deleteLine(line.id)"
                >
                  Quitar
                </UiButton>
              </span>
            </div>
            <p v-if="group.lines.length === 0" class="estimating-empty">Sin insumos de este tipo.</p>
          </section>
          </div>
        </div>
        <UiEmptyState
          v-else
          title="Sin insumos todavía"
          description="Agrega el primer insumo para calcular el costo unitario del APU."
        />

        <div
          v-if="apuDetail.current_version_status !== 'approved' && !entitlementsStore.isReadOnly"
          v-permission="Permissions.ESTIMATING.UPDATE"
        >
          <UiFormSection
            title="Agregar insumo"
            description="El desperdicio se suma a la cantidad y el rendimiento multiplica el costo de la línea."
          >
            <div class="inline-form">
              <UiSelect
                v-model="lineForm.resourceId"
                label="Insumo"
                :options="resourceOptions"
                placeholder="Buscar insumo..."
                searchable
                :clearable="false"
              />
              <UiInput v-model="lineForm.quantity" label="Cantidad" type="number" />
              <UiInput
                v-model="lineForm.wastePct"
                label="Desperdicio %"
                type="number"
                hint="Porcentaje adicional sobre la cantidad."
              />
              <UiInput
                v-model="lineForm.performance"
                label="Rendimiento"
                type="number"
                hint="Factor multiplicador: 1 no ajusta el costo."
              />
              <UiButton size="sm" variant="outline" width="auto" :disabled="!lineForm.resourceId" @click="addLine">
                Agregar insumo
              </UiButton>
            </div>
          </UiFormSection>
        </div>
        <p v-else-if="apuDetail.current_version_status === 'approved'" class="estimating-meta">
          APU aprobado. Crea una nueva versión para editar los insumos.
        </p>
      </template>
    </UiFormModal>

    <!-- Precios de proveedor del insumo -->
    <UiFormModal
      v-model="isPricesOpen"
      :title="priceTarget ? `Precios · ${priceTarget.resource_name}` : 'Precios de proveedor'"
      description="Precios de referencia por proveedor. No modifican el costo del APU ni el de sus insumos."
      size="large"
      :hide-footer="true"
    >
      <UiFormSection
        title="Nuevo precio"
        description="Registra el valor cotizado y, si aplica, su vigencia."
      >
        <div class="price-add">
          <UiSelect
            v-model="priceForm.supplierPartyId"
            :options="supplierOptions"
            placeholder="Proveedor (opcional)"
            label="Proveedor"
          />
          <UiInput v-model="priceForm.price" label="Precio" type="number" />
          <UiSelect v-model="priceForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
          <UiInput v-model="priceForm.validFrom" label="Desde" type="date" />
          <UiInput v-model="priceForm.validTo" label="Hasta" type="date" />
          <UiButton
            size="sm"
            variant="outline"
            width="auto"
            :loading="isSaving"
            :disabled="!priceTarget"
            @click="addPrice"
          >
            Agregar precio
          </UiButton>
        </div>
      </UiFormSection>

      <div v-if="isLoadingPrices" class="estimating-loading" aria-hidden="true">
        <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
      </div>
      <ul v-else-if="prices.length > 0" class="prices-list">
        <li v-for="price in prices" :key="price.id" class="price-row">
          <span>{{ price.supplier_name || 'Sin proveedor' }}</span>
          <span>{{ formatMoney(price.price, price.currency_code) }}</span>
          <span>{{ price.valid_from ? formatDate(price.valid_from) : '—' }} → {{ price.valid_to ? formatDate(price.valid_to) : '—' }}</span>
          <span>{{ price.source || '—' }}</span>
          <UiButton
            v-if="!entitlementsStore.isReadOnly"
            v-permission="Permissions.ESTIMATING.UPDATE"
            size="sm"
            variant="ghost"
            width="auto"
            class="danger-action"
            @click="removePrice(price.id)"
          >
            Quitar
          </UiButton>
        </li>
      </ul>
      <UiEmptyState
        v-else
        title="Sin precios registrados"
        description="Agrega una cotización para comparar proveedores de este insumo."
      />
    </UiFormModal>

    <!-- Importar APUs -->
    <UiFormModal
      v-model="isImportOpen"
      title="Importar APUs"
      description="Cada fila es un insumo. Las filas con el mismo código de APU se agrupan."
      submit-label="Importar"
      size="large"
      :loading="isImporting"
      footer-hint="Máximo 500 filas y 10 MB. Reimportar el mismo archivo vuelve a agregar los insumos."
      @submit="importApus"
    >
      <UiAlert v-if="importError" type="error">{{ importError }}</UiAlert>
      <UiAlert v-if="importResult" type="success">
        {{ importResult.apusCreated }} APUs creados, {{ importResult.apusUpdated }} actualizados,
        {{ importResult.linesCreated }} insumos y {{ importResult.resourcesCreated }} recursos nuevos.
      </UiAlert>
      <UiAlert v-if="importResult?.errors.length" type="warning">
        {{ importResult.errors.length }} filas con observaciones:
        <ul>
          <li v-for="(message, index) in importResult.errors.slice(0, 8)" :key="index">{{ message }}</li>
        </ul>
      </UiAlert>
      <UiSelect v-model="importBaseId" label="Base destino" :options="baseOptions" :clearable="false" />
      <UiFileDropzone
        v-model="importFile"
        accept=".csv,.xlsx"
        hint="Columnas: apu_codigo, apu_nombre, apu_unidad, insumo_codigo, insumo_nombre, tipo, unidad_insumo, cantidad, desperdicio, rendimiento, costo. Máximo 500 filas."
      />
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      :title="deleteCopy.title"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="removeTarget"
    >
      {{ deleteCopy.message }}
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiTableFilters from '@/components/ui/UiTableFilters.vue';
import UiTableColumnMenu from '@/components/ui/UiTableColumnMenu.vue';
import ResourceTable from '@/components/estimating/ResourceTable.vue';
import ApuBaseTable from '@/components/estimating/ApuBaseTable.vue';
import ApuTable from '@/components/estimating/ApuTable.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiTabs from '@/components/ui/UiTabs.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';
import { IconFileImport, IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { estimatingService } from '@/services/estimating.service';
import { catalogService } from '@/services/catalog.service';
import { partyService } from '@/services/party.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useAppTable } from '@/composables/useAppTable';
import {
  useApuBaseColumns,
  useApuColumns,
  useResourceColumns,
} from '@/composables/useEstimatingColumns';
import type { TableFilterDef } from '@/components/ui/UiTableFilters.vue';
import { apiErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import type {
  Apu,
  ApuBase,
  ApuDetail,
  ApuLine,
  ImportApusResult,
  Resource,
  ResourcePrice,
  ResourceType,
} from '@/types/estimating';
import type { Currency, Unit } from '@/types/catalog';
import type { PartyListItem } from '@/types/party';
import type { UiTabItem } from '@/types/ui';

type Tab = 'resources' | 'bases' | 'apus';
type DeleteTarget =
  | { type: 'resource'; item: Resource }
  | { type: 'base'; item: ApuBase }
  | { type: 'apu'; item: Apu };

const TABS: UiTabItem[] = [
  { label: 'Recursos', value: 'resources' },
  { label: 'Bases APU', value: 'bases' },
  { label: 'APUs', value: 'apus' },
];

const RESOURCE_TYPE_OPTIONS = [
  { label: 'Material', value: 'material' },
  { label: 'Mano de obra', value: 'labor' },
  { label: 'Equipo', value: 'equipment' },
  { label: 'Transporte', value: 'transport' },
  { label: 'Subcontrato', value: 'subcontract' },
] as const;

const resourceTypeOptions = [...RESOURCE_TYPE_OPTIONS];
const resourceFilterOptions = [{ label: 'Todos los tipos', value: '' }, ...RESOURCE_TYPE_OPTIONS];

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const activeTab = ref<Tab>('resources');
const activeTabModel = computed({
  get: () => activeTab.value as string,
  set: (value: string) => {
    activeTab.value = value as Tab;
  },
});
const isLoading = ref(false);
const error = ref<string | null>(null);

const resources = ref<Resource[]>([]);
const bases = ref<ApuBase[]>([]);
const apus = ref<Apu[]>([]);
const units = ref<Unit[]>([]);
const currencies = ref<Currency[]>([]);

const resourceSearch = ref('');
const resourceTypeFilter = ref<'' | ResourceType>('');
const apuSearch = ref('');
const apuBaseFilter = ref('');

const resourceOptions = computed(() =>
  resources.value.map((resource) => ({
    label: `${resource.code} · ${resource.name}`,
    value: resource.id,
  })),
);
const unitOptions = computed(() =>
  units.value.map((unit) => ({ label: `${unit.code} · ${unit.name}`, value: unit.id })),
);
const currencyOptions = computed(() =>
  currencies.value.map((currency) => ({ label: `${currency.code} · ${currency.name}`, value: currency.code })),
);
const baseOptions = computed(() =>
  bases.value.map((base) => ({ label: `${base.code} · ${base.name}`, value: base.id })),
);
const baseFilterOptions = computed(() => [
  { label: 'Todas las bases', value: '' },
  ...bases.value.map((base) => ({ label: base.name, value: base.id })),
]);

const filteredResources = computed(() => {
  const query = resourceSearch.value.trim().toLowerCase();
  return resources.value.filter((resource) => {
    if (resourceTypeFilter.value && resource.resource_type !== resourceTypeFilter.value) return false;
    if (!query) return true;
    return resource.code.toLowerCase().includes(query) || resource.name.toLowerCase().includes(query);
  });
});

const filteredApus = computed(() => {
  const query = apuSearch.value.trim().toLowerCase();
  return apus.value.filter((apu) => {
    if (apuBaseFilter.value && apu.base_id !== apuBaseFilter.value) return false;
    if (!query) return true;
    return apu.code.toLowerCase().includes(query) || apu.name.toLowerCase().includes(query);
  });
});

const resourceFilterValues = computed<Record<string, string>>({
  get: () => ({ search: resourceSearch.value, type: resourceTypeFilter.value }),
  set: (values) => {
    resourceSearch.value = values.search ?? '';
    resourceTypeFilter.value = (values.type ?? '') as '' | ResourceType;
  },
});
const resourceFilterDefs: TableFilterDef[] = [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar recursos',
    placeholder: 'Buscar recurso...',
    grow: true,
  },
  {
    key: 'type',
    type: 'select',
    label: 'Filtrar por tipo',
    placeholder: 'Todos los tipos',
    options: resourceFilterOptions,
  },
];
const hasResourceFilters = computed(
  () => resourceSearch.value.trim() !== '' || resourceTypeFilter.value !== '',
);

const apuFilterValues = computed<Record<string, string>>({
  get: () => ({ search: apuSearch.value, base: apuBaseFilter.value }),
  set: (values) => {
    apuSearch.value = values.search ?? '';
    apuBaseFilter.value = values.base ?? '';
  },
});
const apuFilterDefs = computed<TableFilterDef[]>(() => [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar APUs',
    placeholder: 'Buscar APU...',
    grow: true,
  },
  {
    key: 'base',
    type: 'select',
    label: 'Filtrar por base',
    placeholder: 'Todas las bases',
    options: baseFilterOptions.value,
  },
]);
const hasApuFilters = computed(
  () => apuSearch.value.trim() !== '' || apuBaseFilter.value !== '',
);

const resourceTable = useAppTable<Resource>({
  columns: useResourceColumns(),
  data: computed(() => filteredResources.value),
});
const apuBaseTable = useAppTable<ApuBase>({
  columns: useApuBaseColumns(),
  data: computed(() => bases.value),
});
const apuTable = useAppTable<Apu>({
  columns: useApuColumns(),
  data: computed(() => filteredApus.value),
});

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
    const [resourceData, baseData, apuData, unitData, currencyData] = await Promise.all([
      estimatingService.listResources(),
      estimatingService.listApuBases(),
      estimatingService.listApus(),
      catalogService.listUnits(),
      catalogService.getCurrencies(),
    ]);
    resources.value = resourceData;
    bases.value = baseData;
    apus.value = apuData;
    units.value = unitData;
    currencies.value = currencyData;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar la estimación');
  } finally {
    isLoading.value = false;
  }
}

// --- Recurso ---
const isResourceOpen = ref(false);
const editingResource = ref<Resource | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const resourceForm = reactive({
  resourceType: 'material' as ResourceType,
  code: '',
  name: '',
  unitId: '',
  baseCost: '0',
  currencyCode: 'COP',
  description: '',
});
const { isDirty: isResourceDirty, capture: captureResourceForm } = useDirtyForm(() => ({
  ...resourceForm,
}));

function openResourceCreate(): void {
  editingResource.value = null;
  Object.assign(resourceForm, {
    resourceType: 'material',
    code: '',
    name: '',
    unitId: units.value[0]?.id ?? '',
    baseCost: '0',
    currencyCode: currencies.value.find((currency) => currency.code === 'COP')?.code ?? 'COP',
    description: '',
  });
  captureResourceForm();
  formError.value = null;
  isResourceOpen.value = true;
}

function openResourceEdit(resource: Resource): void {
  editingResource.value = resource;
  Object.assign(resourceForm, {
    resourceType: resource.resource_type,
    code: resource.code,
    name: resource.name,
    unitId: resource.unit_id,
    baseCost: String(resource.base_cost),
    currencyCode: resource.currency_code,
    description: resource.description ?? '',
  });
  captureResourceForm();
  formError.value = null;
  isResourceOpen.value = true;
}

async function saveResource(): Promise<void> {
  if (!resourceForm.code.trim() || !resourceForm.name.trim() || !resourceForm.unitId) {
    formError.value = 'Código, nombre y unidad son obligatorios.';
    return;
  }
  isSaving.value = true;
  try {
    const payload = {
      resourceType: resourceForm.resourceType,
      code: resourceForm.code.trim(),
      name: resourceForm.name.trim(),
      unitId: resourceForm.unitId,
      baseCost: Number(resourceForm.baseCost),
      currencyCode: resourceForm.currencyCode,
      description: resourceForm.description.trim() || null,
    };
    if (editingResource.value) {
      await estimatingService.updateResource(editingResource.value.id, payload);
      toast.success('Recurso actualizado');
    } else {
      await estimatingService.createResource(payload);
      toast.success('Recurso creado');
    }
    isResourceOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el recurso');
  } finally {
    isSaving.value = false;
  }
}

// --- Base ---
const isBaseOpen = ref(false);
const editingBase = ref<ApuBase | null>(null);
const baseForm = reactive({ code: '', name: '', source: '', description: '' });
const { isDirty: isBaseDirty, capture: captureBaseForm } = useDirtyForm(() => ({ ...baseForm }));

function openBaseCreate(): void {
  editingBase.value = null;
  Object.assign(baseForm, { code: '', name: '', source: '', description: '' });
  captureBaseForm();
  formError.value = null;
  isBaseOpen.value = true;
}

function openBaseEdit(base: ApuBase): void {
  editingBase.value = base;
  Object.assign(baseForm, {
    code: base.code,
    name: base.name,
    source: base.source ?? '',
    description: base.description ?? '',
  });
  captureBaseForm();
  formError.value = null;
  isBaseOpen.value = true;
}

async function saveBase(): Promise<void> {
  if (!baseForm.code.trim() || !baseForm.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  try {
    const payload = {
      code: baseForm.code.trim(),
      name: baseForm.name.trim(),
      source: baseForm.source.trim() || null,
      description: baseForm.description.trim() || null,
    };
    if (editingBase.value) {
      await estimatingService.updateApuBase(editingBase.value.id, payload);
      toast.success('Base actualizada');
    } else {
      await estimatingService.createApuBase(payload);
      toast.success('Base creada');
    }
    isBaseOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar la base');
  } finally {
    isSaving.value = false;
  }
}

// --- APU ---
const isApuOpen = ref(false);
const editingApu = ref<Apu | null>(null);
const apuForm = reactive({ baseId: '', code: '', name: '', unitId: '', description: '' });
const { isDirty: isApuDirty, capture: captureApuForm } = useDirtyForm(() => ({ ...apuForm }));

function openApuCreate(): void {
  editingApu.value = null;
  Object.assign(apuForm, {
    baseId: bases.value[0]?.id ?? '',
    code: '',
    name: '',
    unitId: units.value[0]?.id ?? '',
    description: '',
  });
  captureApuForm();
  formError.value = null;
  isApuOpen.value = true;
}

function openApuEdit(apu: Apu): void {
  editingApu.value = apu;
  Object.assign(apuForm, {
    baseId: apu.base_id,
    code: apu.code,
    name: apu.name,
    unitId: apu.unit_id,
    description: apu.description ?? '',
  });
  captureApuForm();
  formError.value = null;
  isApuOpen.value = true;
}

async function saveApu(): Promise<void> {
  if (!apuForm.baseId || !apuForm.code.trim() || !apuForm.name.trim() || !apuForm.unitId) {
    formError.value = 'Base, código, nombre y unidad son obligatorios.';
    return;
  }
  isSaving.value = true;
  try {
    const payload = {
      baseId: apuForm.baseId,
      code: apuForm.code.trim(),
      name: apuForm.name.trim(),
      unitId: apuForm.unitId,
      description: apuForm.description.trim() || null,
    };
    if (editingApu.value) {
      await estimatingService.updateApu(editingApu.value.id, payload);
      toast.success('APU actualizado');
    } else {
      await estimatingService.createApu(payload);
      toast.success('APU creado');
    }
    isApuOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el APU');
  } finally {
    isSaving.value = false;
  }
}

// --- Insumos ---
const isLinesOpen = ref(false);
const isLoadingDetail = ref(false);
const apuDetail = ref<ApuDetail | null>(null);
const lineForm = reactive({ resourceId: '', quantity: '1', wastePct: '0', performance: '1' });

const lineGroups = computed(() => {
  const groups = [
    { type: 'equipment' as const, label: 'Equipos' },
    { type: 'material' as const, label: 'Materiales' },
    { type: 'labor' as const, label: 'Mano de obra' },
    { type: 'transport' as const, label: 'Transportes' },
    { type: 'subcontract' as const, label: 'Subcontratos' },
  ];
  return groups.map((group) => {
    const lines = (apuDetail.value?.lines ?? []).filter((line) => line.component_type === group.type);
    return {
      ...group,
      lines,
      total: lines.reduce((sum, line) => sum + line.partial_amount, 0),
    };
  }).filter((group) => group.lines.length > 0);
});

async function openApuLines(apu: Apu): Promise<void> {
  isLinesOpen.value = true;
  isLoadingDetail.value = true;
  apuDetail.value = null;
  lineForm.resourceId = '';
  lineForm.quantity = '1';
  lineForm.wastePct = '0';
  lineForm.performance = '1';
  try {
    apuDetail.value = await estimatingService.getApu(apu.id);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar el APU'));
    isLinesOpen.value = false;
  } finally {
    isLoadingDetail.value = false;
  }
}

async function addLine(): Promise<void> {
  if (!apuDetail.value || !lineForm.resourceId) return;
  isSaving.value = true;
  try {
    await estimatingService.addApuLine(apuDetail.value.id, {
      resourceId: lineForm.resourceId,
      quantity: Number(lineForm.quantity),
      wastePct: Number(lineForm.wastePct),
      performance: Number(lineForm.performance),
    });
    apuDetail.value = await estimatingService.getApu(apuDetail.value.id);
    lineForm.resourceId = '';
    await load();
    toast.success('Insumo agregado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el insumo'));
  } finally {
    isSaving.value = false;
  }
}

async function deleteLine(lineId: string): Promise<void> {
  if (!apuDetail.value) return;
  try {
    await estimatingService.deleteApuLine(lineId);
    apuDetail.value = await estimatingService.getApu(apuDetail.value.id);
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el insumo'));
  }
}

async function approveApu(): Promise<void> {
  if (!apuDetail.value) return;
  isSaving.value = true;
  try {
    apuDetail.value = await estimatingService.approveApu(apuDetail.value.id);
    await load();
    toast.success('APU aprobado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos aprobar el APU'));
  } finally {
    isSaving.value = false;
  }
}

async function newApuVersion(): Promise<void> {
  if (!apuDetail.value) return;
  isSaving.value = true;
  try {
    apuDetail.value = await estimatingService.createApuVersion(apuDetail.value.id);
    await load();
    toast.success('Nueva versión creada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos crear la versión'));
  } finally {
    isSaving.value = false;
  }
}

const canEditLines = computed(
  () =>
    Boolean(apuDetail.value) &&
    apuDetail.value?.current_version_status !== 'approved' &&
    !entitlementsStore.isReadOnly,
);

async function saveLine(
  lineId: string,
  payload: { quantity?: number; wastePct?: number; performance?: number },
): Promise<void> {
  if (!apuDetail.value) return;
  try {
    await estimatingService.updateApuLine(lineId, payload);
    apuDetail.value = await estimatingService.getApu(apuDetail.value.id);
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos actualizar el insumo'));
    apuDetail.value = await estimatingService.getApu(apuDetail.value.id);
  }
}

// --- Precios de proveedor ---
const isPricesOpen = ref(false);
const priceTarget = ref<ApuLine | null>(null);
const prices = ref<ResourcePrice[]>([]);
const isLoadingPrices = ref(false);
const suppliers = ref<PartyListItem[]>([]);
const priceForm = reactive({
  supplierPartyId: '',
  price: '0',
  currencyCode: 'COP',
  validFrom: '',
  validTo: '',
});

const supplierOptions = computed(() =>
  suppliers.value.map((supplier) => ({ label: supplier.name, value: supplier.id })),
);

async function loadSuppliers(): Promise<void> {
  if (suppliers.value.length > 0) return;
  try {
    const response = await partyService.list({ role: 'supplier', limit: 100 });
    suppliers.value = response.data;
  } catch {
    suppliers.value = [];
  }
}

async function openPrices(line: ApuLine): Promise<void> {
  priceTarget.value = line;
  isPricesOpen.value = true;
  isLoadingPrices.value = true;
  prices.value = [];
  Object.assign(priceForm, {
    supplierPartyId: '',
    price: String(line.unit_cost_snapshot),
    currencyCode: line.currency_code || 'COP',
    validFrom: '',
    validTo: '',
  });
  try {
    const [priceData] = await Promise.all([
      estimatingService.listResourcePrices(line.resource_id),
      loadSuppliers(),
    ]);
    prices.value = priceData;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar los precios'));
  } finally {
    isLoadingPrices.value = false;
  }
}

async function addPrice(): Promise<void> {
  if (!priceTarget.value) return;
  const price = Number(priceForm.price);
  if (!Number.isFinite(price) || price < 0) {
    toast.error('El precio debe ser un número mayor o igual a cero');
    return;
  }
  isSaving.value = true;
  try {
    await estimatingService.addResourcePrice(priceTarget.value.resource_id, {
      supplierPartyId: priceForm.supplierPartyId || null,
      price,
      currencyCode: priceForm.currencyCode,
      validFrom: priceForm.validFrom || null,
      validTo: priceForm.validTo || null,
      source: 'manual',
    });
    prices.value = await estimatingService.listResourcePrices(priceTarget.value.resource_id);
    toast.success('Precio agregado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos agregar el precio'));
  } finally {
    isSaving.value = false;
  }
}

async function removePrice(id: string): Promise<void> {
  if (!priceTarget.value) return;
  try {
    await estimatingService.deleteResourcePrice(priceTarget.value.resource_id, id);
    prices.value = await estimatingService.listResourcePrices(priceTarget.value.resource_id);
    toast.success('Precio eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el precio'));
  }
}

// --- Importar APUs ---
const isImportOpen = ref(false);
const importBaseId = ref('');
const importFile = ref<File | null>(null);
const isImporting = ref(false);
const importError = ref<string | null>(null);
const importResult = ref<ImportApusResult | null>(null);

function openImport(): void {
  importBaseId.value = bases.value[0]?.id ?? '';
  importFile.value = null;
  importError.value = null;
  importResult.value = null;
  isImportOpen.value = true;
}

async function importApus(): Promise<void> {
  importError.value = null;
  if (!importBaseId.value) {
    importError.value = 'Selecciona la base de APUs destino.';
    return;
  }
  if (!importFile.value) {
    importError.value = 'Adjunta un archivo .csv o .xlsx.';
    return;
  }
  isImporting.value = true;
  try {
    importResult.value = await estimatingService.importApus(importBaseId.value, importFile.value);
    importFile.value = null;
    await load();
    toast.success('Importación procesada');
  } catch (err) {
    importError.value = apiErrorMessage(err, 'No pudimos importar los APUs');
  } finally {
    isImporting.value = false;
  }
}

// --- Eliminar ---
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const deleteTarget = ref<DeleteTarget | null>(null);

const deleteCopy = computed(() => {
  const target = deleteTarget.value;
  if (!target) return { title: 'Eliminar registro', message: '' };
  if (target.type === 'resource') {
    return {
      title: 'Eliminar recurso',
      message: `¿Eliminar ${target.item.code} · ${target.item.name}? Los APUs que ya lo usan conservan su costo congelado.`,
    };
  }
  if (target.type === 'base') {
    return {
      title: 'Eliminar base de APUs',
      message: `¿Eliminar ${target.item.code} · ${target.item.name}? La base debe estar vacía: elimina o mueve sus APUs primero.`,
    };
  }
  return {
    title: 'Eliminar APU',
    message: `¿Eliminar ${target.item.code} · ${target.item.name}? Se eliminarán sus versiones e insumos; las actividades de presupuesto conservan el precio con el que se agregaron.`,
  };
});

function confirmResourceDelete(resource: Resource): void {
  deleteTarget.value = { type: 'resource', item: resource };
  isDeleteOpen.value = true;
}

function confirmBaseDelete(base: ApuBase): void {
  deleteTarget.value = { type: 'base', item: base };
  isDeleteOpen.value = true;
}

function confirmApuDelete(apu: Apu): void {
  deleteTarget.value = { type: 'apu', item: apu };
  isDeleteOpen.value = true;
}

async function removeTarget(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    if (deleteTarget.value.type === 'resource') {
      await estimatingService.deleteResource(deleteTarget.value.item.id);
    } else if (deleteTarget.value.type === 'base') {
      await estimatingService.deleteApuBase(deleteTarget.value.item.id);
    } else {
      await estimatingService.deleteApu(deleteTarget.value.item.id);
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
</script>

<style scoped>
.estimating-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.estimating-tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.estimating-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 220px);
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.estimating-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.estimating-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.estimating-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.estimating-row + .estimating-row {
  border-top: 1px solid var(--border);
}

.estimating-badge {
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

.estimating-copy {
  min-width: 0;
  flex: 1;
}

.estimating-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.estimating-title-row h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.estimating-meta {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.estimating-actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.estimating-empty {
  padding: var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.danger-action {
  color: var(--color-danger);
}

.apu-summary {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.line-table-scroll {
  overflow-x: auto;
  margin: 0 calc(var(--space-1) * -1);
  padding: 0 var(--space-1);
}

.line-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.line-head,
.line-row {
  display: grid;
  grid-template-columns: minmax(170px, 1fr) 55px 70px 80px 80px 100px 100px 160px;
  gap: var(--space-2);
  align-items: center;
  min-width: 815px;
}

.line-head {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
}

.line-group {
  border-top: 1px solid var(--border);
  padding-top: var(--space-2);
}

.line-group:first-child {
  border-top: none;
}

.line-group h4 {
  display: flex;
  justify-content: space-between;
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
}

.line-row {
  padding: var(--space-2) 0;
  font-size: var(--text-xs);
  border-top: 1px solid var(--border);
}

.line-input {
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

.line-actions {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.price-add {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 110px 110px 130px 130px auto;
  gap: var(--space-2);
  align-items: end;
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--space-3);
}

.prices-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow: auto;
}

.price-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 110px 190px minmax(120px, 1fr) auto;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) 0;
  font-size: var(--text-xs);
  border-bottom: 1px solid var(--border);
}

.inline-form {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.inline-form > * {
  flex: 1 1 160px;
  min-width: 0;
}

.inline-form > .ui-button {
  flex: 0 0 auto;
  margin-top: 1.65rem;
}

@media (max-width: 800px) {
  .estimating-toolbar {
    grid-template-columns: 1fr;
  }

  .estimating-row {
    flex-wrap: wrap;
  }

  .estimating-actions {
    width: 100%;
    justify-content: flex-start;
    padding-left: calc(58px + var(--space-3));
  }

  .price-add {
    grid-template-columns: 1fr;
  }

  .price-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
