<template>
  <AuthenticatedLayout>
    <div class="execution-page">
      <UiPageHeader
        :title="project ? `Ejecución · ${project.name}` : 'Ejecución'"
        :subtitle="project ? `${project.code} · ${project.currency_code}` : 'Cargando…'"
      >
        <template #actions>
          <UiButton variant="ghost" width="auto" @click="router.push(companyPath(`/projects/${projectId}`))">
            <IconArrowLeft :size="16" /> Proyecto
          </UiButton>
          <UiButton
            variant="outline"
            width="auto"
            @click="router.push(companyPath(`/projects/${projectId}/budget`))"
          >
            <IconCalculator :size="16" /> Presupuesto
          </UiButton>
          <UiTableColumnMenu
            v-if="activeTab === 'schedule'"
            :table="scheduleTable"
          />
          <UiTableColumnMenu
            v-else-if="activeTab === 'contracts'"
            :table="contractTable"
          />
          <UiTableColumnMenu
            v-else-if="activeTab === 'payroll'"
            :table="payrollTable"
          />
          <UiTableColumnMenu
            v-else-if="activeTab === 'warehouse'"
            :table="warehouseTable"
          />
          <UiTableColumnMenu v-else :table="purchaseTable" />
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div v-if="isLoading" class="execution-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="260px" />
        <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
      </div>

      <template v-else>
        <UiTabs
          v-model="activeTabModel"
          :tabs="tabItems"
          group-label="Secciones de ejecución"
          scrollable
          panel-id-prefix="execution"
        />

        <!-- Programación -->
        <UiCard
          v-if="activeTab === 'schedule'"
          id="execution-panel-schedule"
          role="tabpanel"
          aria-labelledby="execution-tab-schedule"
        >
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Programación de obra</h2>
              <p class="execution-hint">Cronograma de actividades y avance físico.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openSchedule()">
              <IconPlus :size="16" /> Actividad
            </UiButton>
          </div>

          <ScheduleTable
            :table="scheduleTable"
            :loading="isLoadingSection"
            :error="error"
            error-title="No pudimos cargar la programación"
            empty-title="Sin actividades programadas"
            empty-description="Crea la primera actividad para hacer seguimiento al avance físico de la obra."
            @retry="loadSection('schedule')"
            @edit="openSchedule"
            @delete="(activity) => confirmRemove(`¿Eliminar la actividad ${activity.name}?`, () => removeSchedule(activity.id))"
          >
            <template #empty-action>
              <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openSchedule()">
                <IconPlus :size="16" /> Programar actividad
              </UiButton>
            </template>
          </ScheduleTable>
        </UiCard>

        <!-- Contratos -->
        <UiCard
          v-else-if="activeTab === 'contracts'"
          id="execution-panel-contracts"
          role="tabpanel"
          aria-labelledby="execution-tab-contracts"
        >
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Contratos</h2>
              <p class="execution-hint">Contratos de obra, subcontratos, servicios y suministros.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openContract()">
              <IconPlus :size="16" /> Contrato
            </UiButton>
          </div>

          <ContractsTable
            :table="contractTable"
            :loading="isLoadingSection"
            :error="error"
            error-title="No pudimos cargar los contratos"
            empty-title="Sin contratos registrados"
            empty-description="Registra contratos de obra, subcontratos, servicios y suministros del proyecto."
            @retry="loadSection('contracts')"
            @edit="openContract"
            @delete="(contract) => confirmRemove(`¿Eliminar el contrato ${contract.code}?`, () => removeContract(contract.id))"
          >
            <template #empty-action>
              <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openContract()">
                <IconPlus :size="16" /> Nuevo contrato
              </UiButton>
            </template>
          </ContractsTable>
        </UiCard>

        <!-- Nómina -->
        <UiCard
          v-else-if="activeTab === 'payroll'"
          id="execution-panel-payroll"
          role="tabpanel"
          aria-labelledby="execution-tab-payroll"
        >
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Nómina de obra</h2>
              <p class="execution-hint">Registros de pago por trabajador y período.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openPayroll()">
              <IconPlus :size="16" /> Registro
            </UiButton>
          </div>

          <PayrollTable
            :table="payrollTable"
            :loading="isLoadingSection"
            :error="error"
            error-title="No pudimos cargar la nómina"
            empty-title="Sin registros de nómina"
            empty-description="Registra los periodos de nómina para controlar la mano de obra ejecutada."
            @retry="loadSection('payroll')"
            @edit="openPayroll"
            @delete="(entry) => confirmRemove(`¿Eliminar el registro de ${entry.worker_name}?`, () => removePayroll(entry.id))"
          >
            <template #empty-action>
              <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openPayroll()">
                <IconPlus :size="16" /> Nuevo registro
              </UiButton>
            </template>
          </PayrollTable>
        </UiCard>

        <!-- Almacén -->
        <div
          v-else-if="activeTab === 'warehouse'"
          id="execution-panel-warehouse"
          class="warehouse-layout"
          role="tabpanel"
          aria-labelledby="execution-tab-warehouse"
        >
          <UiCard>
            <div class="execution-heading">
              <div>
                <h2 class="execution-title">Almacenes</h2>
                <p class="execution-hint">Bodegas del proyecto o de la empresa.</p>
              </div>
              <UiButton v-permission="Permissions.EXECUTION.CREATE" size="sm" width="auto" @click="openWarehouse()">
                <IconPlus :size="15" /> Almacén
              </UiButton>
            </div>

            <WarehouseTable
              :table="warehouseTable"
              :selected-id="selectedWarehouseId"
              :loading="isLoadingSection"
              :error="error"
              error-title="No pudimos cargar los almacenes"
              empty-title="Sin almacenes"
              empty-description="Crea el primer almacén para registrar entradas, salidas y ajustes de stock."
              @retry="loadSection('warehouse')"
              @select="(warehouse) => selectWarehouse(warehouse.id)"
              @edit="openWarehouse"
              @delete="(warehouse) => confirmRemove(`¿Eliminar el almacén ${warehouse.code}?`, () => removeWarehouse(warehouse.id))"
            >
              <template #empty-action>
                <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openWarehouse()">
                  <IconPlus :size="16" /> Nuevo almacén
                </UiButton>
              </template>
            </WarehouseTable>
          </UiCard>

          <UiCard>
            <div class="execution-heading">
              <div>
                <h2 class="execution-title">Movimientos de stock</h2>
                <p class="execution-hint">
                  {{ selectedWarehouse ? `Almacén ${selectedWarehouse.code}` : 'Selecciona un almacén' }}
                </p>
              </div>
              <UiButton
                v-if="selectedWarehouse"
                v-permission="Permissions.EXECUTION.CREATE"
                size="sm"
                width="auto"
                @click="openMovement"
              >
                <IconPlus :size="15" /> Movimiento
              </UiButton>
            </div>

            <UiEmptyState
              v-if="!selectedWarehouse"
              title="Selecciona un almacén"
              description="Elige un almacén de la lista para ver y registrar sus movimientos."
            />
            <MovementsTable
              v-else
              :table="movementTable"
              :currency="project?.currency_code"
              :loading="isLoadingMovements"
              empty-title="Sin movimientos registrados"
              empty-description="Registra entradas, salidas o ajustes para controlar el stock del almacén."
              @delete="(movement) => confirmRemove('¿Eliminar este movimiento?', () => removeMovement(movement.id))"
            />
          </UiCard>
        </div>

        <!-- Compras -->
        <UiCard
          v-else-if="activeTab === 'purchases'"
          id="execution-panel-purchases"
          role="tabpanel"
          aria-labelledby="execution-tab-purchases"
        >
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Órdenes de compra</h2>
              <p class="execution-hint">Compras de insumos y suministros del proyecto.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openPurchase()">
              <IconPlus :size="16" /> Orden de compra
            </UiButton>
          </div>

          <div v-if="isLoadingSection" class="execution-loading" aria-hidden="true">
            <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
          </div>
          <PurchaseOrdersTable
            :table="purchaseTable"
            :loading="isLoadingSection"
            :error="error"
            error-title="No pudimos cargar las órdenes"
            empty-title="Sin órdenes de compra"
            empty-description="Crea una orden para solicitar insumos y controlar su recepción."
            @retry="loadSection('purchases')"
            @open="(order) => openPurchaseDetail(order.id)"
            @delete="(order) => confirmRemove(`¿Eliminar la orden ${order.code}?`, () => removePurchase(order.id))"
          >
            <template #empty-action>
              <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openPurchase()">
                <IconPlus :size="16" /> Nueva orden
              </UiButton>
            </template>
          </PurchaseOrdersTable>
        </UiCard>
      </template>
    </div>

    <!-- Programación -->
    <UiFormModal
      v-model="isScheduleOpen"
      :title="scheduleForm.id ? 'Editar actividad' : 'Nueva actividad'"
      description="Actividad del cronograma con fechas, avance físico y estado."
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      footer-hint="El avance se expresa de 0 a 100 y se muestra en la tabla de programación."
      :dirty="isScheduleDirty"
      :confirm-on-dirty="true"
      @submit="saveSchedule"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Actividad" description="Nombre visible en el cronograma.">
        <UiInput v-model="scheduleForm.name" label="Actividad" required />
      </UiFormSection>
      <UiFormSection title="Fechas y avance" description="Programación y estado actual de la actividad.">
        <div class="form-grid">
          <UiInput v-model="scheduleForm.startDate" label="Inicio" type="date" />
          <UiInput v-model="scheduleForm.endDate" label="Fin" type="date" />
          <UiInput
            v-model="scheduleForm.progressPct"
            label="Avance %"
            type="number"
            hint="Valor entre 0 y 100."
          />
          <UiSelect v-model="scheduleForm.status" label="Estado" :options="scheduleStatusOptions" :clearable="false" />
          <UiInput v-model="scheduleForm.notes" label="Notas" class="span-2" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Contratos -->
    <UiFormModal
      v-model="isContractOpen"
      :title="contractForm.id ? 'Editar contrato' : 'Nuevo contrato'"
      description="Contratos de obra, subcontratos, servicios y suministros del proyecto."
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      footer-hint="Los contratos son control de ejecución y no modifican el presupuesto."
      :dirty="isContractDirty"
      :confirm-on-dirty="true"
      @submit="saveContract"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Identificación" description="Código, tipo y nombre del contrato.">
        <div class="form-grid">
          <UiInput v-model="contractForm.code" label="Código" required />
          <UiSelect v-model="contractForm.contractType" label="Tipo" :options="contractTypeOptions" :clearable="false" />
          <UiInput v-model="contractForm.name" label="Nombre" required class="span-2" />
          <UiSelect v-model="contractForm.partyId" label="Tercero" :options="partyOptions" />
        </div>
      </UiFormSection>
      <UiFormSection title="Valor y vigencia" description="Monto contratado, estado y fechas.">
        <div class="form-grid">
          <UiInput v-model="contractForm.amount" label="Valor" type="number" />
          <UiSelect v-model="contractForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
          <UiSelect v-model="contractForm.status" label="Estado" :options="contractStatusOptions" :clearable="false" />
          <UiInput v-model="contractForm.startDate" label="Inicio" type="date" />
          <UiInput v-model="contractForm.endDate" label="Fin" type="date" />
          <UiInput v-model="contractForm.notes" label="Notas" class="span-2" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Nómina -->
    <UiFormModal
      v-model="isPayrollOpen"
      :title="payrollForm.id ? 'Editar registro de nómina' : 'Nuevo registro de nómina'"
      description="Controla la mano de obra ejecutada por periodo y trabajador."
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      footer-hint="El valor es informativo para el control de ejecución y no genera asientos contables."
      :dirty="isPayrollDirty"
      :confirm-on-dirty="true"
      @submit="savePayroll"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Trabajador" description="Nombre y vínculo con el equipo del proyecto.">
        <div class="form-grid">
          <UiInput v-model="payrollForm.workerName" label="Trabajador" required class="span-2" />
          <UiSelect v-model="payrollForm.membershipId" label="Miembro del equipo" :options="memberOptions" />
          <UiSelect v-model="payrollForm.status" label="Estado" :options="payrollStatusOptions" :clearable="false" />
        </div>
      </UiFormSection>
      <UiFormSection title="Periodo y valor" description="Fechas trabajadas, días y monto del registro.">
        <div class="form-grid">
          <UiInput v-model="payrollForm.periodStart" label="Desde" type="date" required />
          <UiInput v-model="payrollForm.periodEnd" label="Hasta" type="date" required />
          <UiInput v-model="payrollForm.days" label="Días" type="number" />
          <UiInput v-model="payrollForm.amount" label="Valor" type="number" />
          <UiSelect v-model="payrollForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
          <UiInput v-model="payrollForm.notes" label="Notas" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Almacén -->
    <UiFormModal
      v-model="isWarehouseOpen"
      :title="warehouseForm.id ? 'Editar almacén' : 'Nuevo almacén'"
      description="Los almacenes agrupan el stock de insumos del proyecto."
      submit-label="Guardar"
      :loading="isSaving"
      footer-hint="Un almacén inactivo conserva su historial, pero no admite movimientos nuevos."
      :dirty="isWarehouseDirty"
      :confirm-on-dirty="true"
      @submit="saveWarehouse"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Datos del almacén" description="Código, nombre y ubicación física.">
        <div class="form-grid">
          <UiInput v-model="warehouseForm.code" label="Código" required />
          <UiInput v-model="warehouseForm.name" label="Nombre" required class="span-2" />
          <UiInput v-model="warehouseForm.location" label="Ubicación" class="span-2" />
          <UiSelect v-model="warehouseForm.isActive" label="Estado" :options="activeOptions" :clearable="false" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <UiFormModal
      v-model="isMovementOpen"
      title="Registrar movimiento"
      :description="`Entrada, salida o ajuste de stock${selectedWarehouse ? ` en ${selectedWarehouse.code}` : ''}.`"
      submit-label="Registrar"
      size="large"
      :loading="isSaving"
      footer-hint="La salida descuenta stock; el ajuste fija la cantidad según el conteo físico."
      :dirty="isMovementDirty"
      :confirm-on-dirty="true"
      @submit="saveMovement"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Insumo y tipo" description="Qué se mueve y con qué operación.">
        <div class="form-grid">
          <UiSelect v-model="movementForm.resourceId" label="Insumo" :options="resourceOptions" searchable class="span-2" />
          <UiSelect v-model="movementForm.movementType" label="Tipo" :options="movementTypeOptions" :clearable="false" />
          <UiInput v-model="movementForm.quantity" label="Cantidad" type="number" required />
          <UiInput v-model="movementForm.unitCost" label="Costo unitario" type="number" hint="Opcional; si se omite se usa el costo del recurso." />
        </div>
      </UiFormSection>
      <UiFormSection title="Trazabilidad" description="Fecha, documento de referencia y notas.">
        <div class="form-grid">
          <UiInput v-model="movementForm.occurredAt" label="Fecha" type="date" />
          <UiInput v-model="movementForm.reference" label="Referencia" placeholder="Remisión, factura, acta…" />
          <UiInput v-model="movementForm.notes" label="Notas" class="span-2" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Orden de compra -->
    <UiFormModal
      v-model="isPurchaseOpen"
      title="Nueva orden de compra"
      description="Solicita insumos a un proveedor y controla su recepción."
      submit-label="Crear orden"
      size="large"
      :loading="isSaving"
      footer-hint="La orden queda en borrador hasta que la envíes y recibas los insumos."
      :dirty="isPurchaseDirty"
      :confirm-on-dirty="true"
      @submit="savePurchase"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Datos de la orden" description="Código, proveedor, moneda y estado inicial.">
        <div class="form-grid">
          <UiInput v-model="purchaseForm.code" label="Código" required />
          <UiSelect v-model="purchaseForm.supplierPartyId" label="Proveedor" :options="supplierOptions" />
          <UiSelect v-model="purchaseForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
          <UiSelect v-model="purchaseForm.status" label="Estado" :options="purchaseStatusOptions" :clearable="false" />
          <UiInput v-model="purchaseForm.notes" label="Notas" class="span-2" />
        </div>
      </UiFormSection>

      <UiFormSection
        title="Líneas"
        description="Asocia un insumo del catálogo o escribe una descripción libre."
      >
        <div class="po-lines">
          <div class="po-lines-head">
            <span>Insumo (opcional)</span><span>Descripción</span><span>Cantidad</span>
            <span>Valor unitario</span><span></span>
          </div>
          <div v-for="(line, index) in purchaseForm.lines" :key="index" class="po-line">
            <UiSelect v-model="line.resourceId" :options="resourceOptions" searchable aria-label="Insumo" />
            <UiInput v-model="line.description" aria-label="Descripción" placeholder="Descripción" />
            <UiInput v-model="line.quantity" type="number" aria-label="Cantidad" />
            <UiInput v-model="line.unitPrice" type="number" aria-label="Valor unitario" />
            <UiButton
              size="sm"
              variant="ghost"
              width="auto"
              class="danger-action"
              :disabled="purchaseForm.lines.length === 1"
              @click="removePurchaseLine(index)"
            >
              Quitar
            </UiButton>
          </div>
          <div class="po-lines-footer">
            <UiButton size="sm" variant="outline" width="auto" @click="addPurchaseLine">
              <IconPlus :size="15" /> Línea
            </UiButton>
            <span class="po-lines-total">
              Total: <strong>{{ formatMoney(purchaseTotal, purchaseForm.currencyCode) }}</strong>
            </span>
          </div>
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Detalle orden de compra -->
    <UiFormModal
      v-model="isPurchaseDetailOpen"
      title="Orden de compra"
      description="Detalle de insumos, valores y estado de recepción."
      submit-label="Guardar estado"
      size="large"
      :loading="isSaving"
      footer-hint="Al marcar la orden como recibida se actualiza el stock del almacén."
      :hide-footer="!purchaseDetail || purchaseDetail.status === 'received'"
      @submit="savePurchaseStatus"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <template v-if="purchaseDetail">
        <div class="po-summary">
          <span><strong>{{ purchaseDetail.code }}</strong></span>
          <span>{{ purchaseDetail.supplier_name || 'Sin proveedor' }}</span>
          <span>{{ formatMoney(purchaseDetail.total, purchaseDetail.currency_code) }}</span>
          <UiBadge
            :label="purchaseStatusLabel(purchaseDetail.status)"
            :variant="purchaseStatusVariant(purchaseDetail.status)"
            size="sm"
          />
        </div>
        <UiSelect
          v-if="purchaseDetail.status !== 'received'"
          v-model="purchaseStatusDraft"
          label="Estado"
          :options="purchaseStatusOptions"
          :clearable="false"
        />
        <PurchaseLinesTable
          :table="purchaseLineTable"
          :currency="purchaseDetail.currency_code"
        />
      </template>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isDeleteOpen"
      title="Confirmar eliminación"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeleting"
      @confirm="runDelete"
    >
      {{ deleteMessage }}
    </UiConfirmDialog>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiTableColumnMenu from '@/components/ui/UiTableColumnMenu.vue';
import UiTabs from '@/components/ui/UiTabs.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import ScheduleTable from '@/components/execution/ScheduleTable.vue';
import ContractsTable from '@/components/execution/ContractsTable.vue';
import PayrollTable from '@/components/execution/PayrollTable.vue';
import WarehouseTable from '@/components/execution/WarehouseTable.vue';
import MovementsTable from '@/components/execution/MovementsTable.vue';
import PurchaseOrdersTable from '@/components/execution/PurchaseOrdersTable.vue';
import PurchaseLinesTable from '@/components/execution/PurchaseLinesTable.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import {
  IconArrowLeft,
  IconCalculator,
  IconClipboardList,
  IconPlus,
  IconShoppingCart,
  IconTimeline,
  IconTruckDelivery,
  IconUsers,
} from '@tabler/icons-vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useToast } from '@/composables/useToast';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useAppTable } from '@/composables/useAppTable';
import {
  useContractColumns,
  useMovementColumns,
  usePayrollColumns,
  usePurchaseColumns,
  usePurchaseLineColumns,
  useScheduleColumns,
  useWarehouseColumns,
} from '@/composables/useExecutionColumns';
import { executionService } from '@/services/execution.service';
import { projectService } from '@/services/project.service';
import { catalogService } from '@/services/catalog.service';
import { memberService } from '@/services/member.service';
import { partyService } from '@/services/party.service';
import { estimatingService } from '@/services/estimating.service';
import { apiErrorMessage } from '@/utils/error';
import { Permissions } from '@/constants/permissions';
import type { Project } from '@/types/project';
import type { Currency } from '@/types/catalog';
import type { Member } from '@/types/member';
import type { PartyListItem } from '@/types/party';
import type { Resource } from '@/types/estimating';
import type { UiTabItem } from '@/types/ui';
import type {
  Contract,
  ContractStatus,
  ContractType,
  PayrollEntry,
  PayrollStatus,
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderLine,
  PurchaseOrderLinePayload,
  PurchaseOrderStatus,
  ScheduleActivity,
  ScheduleStatus,
  StockMovement,
  Warehouse,
} from '@/types/execution';

type ExecutionTab = 'schedule' | 'contracts' | 'payroll' | 'warehouse' | 'purchases';

const route = useRoute();
const router = useRouter();
const { companyPath } = useCompanyPath();
const toast = useToast();

const projectId = computed(() => String(route.params.projectId ?? ''));
const project = ref<Project | null>(null);
const isLoading = ref(true);
const isLoadingSection = ref(false);
const isLoadingMovements = ref(false);
const error = ref<string | null>(null);

const tabs: Array<{ id: ExecutionTab; label: string; icon: Component }> = [
  { id: 'schedule', label: 'Programación', icon: IconTimeline },
  { id: 'contracts', label: 'Contratos', icon: IconClipboardList },
  { id: 'payroll', label: 'Nómina', icon: IconUsers },
  { id: 'warehouse', label: 'Almacén', icon: IconTruckDelivery },
  { id: 'purchases', label: 'Compras', icon: IconShoppingCart },
];

const activeTab = ref<ExecutionTab>('schedule');
const tabItems = computed<UiTabItem[]>(() =>
  tabs.map((tab) => ({ value: tab.id, label: tab.label, icon: tab.icon })),
);
const activeTabModel = computed({
  get: () => activeTab.value as string,
  set: (value: string) => {
    void selectTab(value as ExecutionTab);
  },
});
const currencies = ref<Currency[]>([]);
const parties = ref<PartyListItem[]>([]);
const members = ref<Member[]>([]);
const resources = ref<Resource[]>([]);

const currencyOptions = computed(() =>
  currencies.value.map((currency) => ({
    label: `${currency.code} · ${currency.name}`,
    value: currency.code,
  })),
);
const partyOptions = computed(() =>
  parties.value.map((party) => ({ label: party.name, value: party.id })),
);
const supplierOptions = computed(() =>
  parties.value
    .filter((party) => party.roles.includes('supplier'))
    .map((party) => ({ label: party.name, value: party.id })),
);
const memberOptions = computed(() =>
  members.value.map((member) => ({ label: `${member.name} · ${member.email}`, value: member.id })),
);
const resourceOptions = computed(() =>
  resources.value.map((resource) => ({
    label: `${resource.code} · ${resource.name} (${resource.unit_code})`,
    value: resource.id,
  })),
);

const scheduleStatusOptions = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'En progreso', value: 'in_progress' },
  { label: 'Completada', value: 'completed' },
  { label: 'Retrasada', value: 'delayed' },
];
const contractTypeOptions = [
  { label: 'Obra', value: 'obra' },
  { label: 'Subcontrato', value: 'subcontrato' },
  { label: 'Servicio', value: 'servicio' },
  { label: 'Suministro', value: 'suministro' },
  { label: 'Otro', value: 'otro' },
];
const contractStatusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Activo', value: 'active' },
  { label: 'Completado', value: 'completed' },
  { label: 'Terminado', value: 'terminated' },
];
const payrollStatusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Pagado', value: 'paid' },
  { label: 'Cancelado', value: 'cancelled' },
];
const movementTypeOptions = [
  { label: 'Entrada', value: 'in' },
  { label: 'Salida', value: 'out' },
  { label: 'Ajuste', value: 'adjustment' },
];
const purchaseStatusOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Enviada', value: 'sent' },
  { label: 'Recibida', value: 'received' },
  { label: 'Cancelada', value: 'cancelled' },
];
const activeOptions = [
  { label: 'Activo', value: 'true' },
  { label: 'Inactivo', value: 'false' },
];

function formatMoney(value: number, currency = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

function purchaseStatusLabel(status: PurchaseOrderStatus): string {
  return purchaseStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function purchaseStatusVariant(status: PurchaseOrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return {
    draft: 'neutral',
    sent: 'info',
    received: 'success',
    cancelled: 'danger',
  }[status] as 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

async function loadLookups(): Promise<void> {
  const [currencyData, partyData, memberResponse, resourceData] = await Promise.all([
    catalogService.getCurrencies(),
    partyService.list({ limit: 100 }),
    memberService.getMembers({ limit: 100 }),
    estimatingService.listResources(),
  ]);
  currencies.value = currencyData;
  parties.value = partyData.data;
  members.value = memberResponse.data;
  resources.value = resourceData;
}

function defaultCurrency(): string {
  return project.value?.currency_code ?? currencies.value.find((currency) => currency.code === 'COP')?.code ?? 'COP';
}

// --- Secciones ---
async function selectTab(tab: ExecutionTab): Promise<void> {
  activeTab.value = tab;
  await loadSection(tab);
}

async function loadSection(tab: ExecutionTab): Promise<void> {
  isLoadingSection.value = true;
  error.value = null;
  try {
    if (tab === 'schedule') schedule.value = await executionService.listSchedule(projectId.value);
    if (tab === 'contracts') contracts.value = await executionService.listContracts(projectId.value);
    if (tab === 'payroll') payroll.value = await executionService.listPayroll(projectId.value);
    if (tab === 'warehouse') {
      warehouses.value = await executionService.listWarehouses(projectId.value);
      if (!selectedWarehouseId.value && warehouses.value[0]) {
        await selectWarehouse(warehouses.value[0].id);
      }
    }
    if (tab === 'purchases') purchaseOrders.value = await executionService.listPurchaseOrders(projectId.value);
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar la información de ejecución');
  } finally {
    isLoadingSection.value = false;
  }
}

// --- Genéricos ---
const isSaving = ref(false);
const formError = ref<string | null>(null);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const deleteMessage = ref('');
const deleteAction = ref<(() => Promise<void>) | null>(null);

function confirmRemove(message: string, action: () => Promise<void>): void {
  deleteMessage.value = message;
  deleteAction.value = action;
  isDeleteOpen.value = true;
}

async function runDelete(): Promise<void> {
  if (!deleteAction.value) return;
  isDeleting.value = true;
  try {
    await deleteAction.value();
    isDeleteOpen.value = false;
  } finally {
    isDeleting.value = false;
    deleteAction.value = null;
  }
}

// --- Programación ---
const schedule = ref<ScheduleActivity[]>([]);
const isScheduleOpen = ref(false);
const scheduleForm = reactive({
  id: '',
  name: '',
  startDate: '',
  endDate: '',
  progressPct: '0',
  status: 'pending' as ScheduleStatus,
  notes: '',
});
const { isDirty: isScheduleDirty, capture: captureScheduleForm } = useDirtyForm(() => ({
  ...scheduleForm,
}));

function openSchedule(activity?: ScheduleActivity): void {
  Object.assign(scheduleForm, {
    id: activity?.id ?? '',
    name: activity?.name ?? '',
    startDate: activity?.start_date?.slice(0, 10) ?? '',
    endDate: activity?.end_date?.slice(0, 10) ?? '',
    progressPct: String(activity?.progress_pct ?? 0),
    status: activity?.status ?? 'pending',
    notes: activity?.notes ?? '',
  });
  captureScheduleForm();
  formError.value = null;
  isScheduleOpen.value = true;
}

async function saveSchedule(): Promise<void> {
  if (!scheduleForm.name.trim()) {
    formError.value = 'El nombre es obligatorio.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    const payload = {
      name: scheduleForm.name.trim(),
      startDate: scheduleForm.startDate || null,
      endDate: scheduleForm.endDate || null,
      progressPct: Number(scheduleForm.progressPct) || 0,
      status: scheduleForm.status,
      notes: scheduleForm.notes.trim() || null,
    };
    if (scheduleForm.id) {
      await executionService.updateScheduleActivity(scheduleForm.id, payload);
    } else {
      await executionService.createScheduleActivity(projectId.value, payload);
    }
    isScheduleOpen.value = false;
    schedule.value = await executionService.listSchedule(projectId.value);
    toast.success('Actividad guardada');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar la actividad');
  } finally {
    isSaving.value = false;
  }
}

async function removeSchedule(id: string): Promise<void> {
  try {
    await executionService.deleteScheduleActivity(id);
    schedule.value = await executionService.listSchedule(projectId.value);
    toast.success('Actividad eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la actividad'));
  }
}

// --- Contratos ---
const contracts = ref<Contract[]>([]);
const isContractOpen = ref(false);
const contractForm = reactive({
  id: '',
  code: '',
  name: '',
  contractType: 'obra' as ContractType,
  partyId: '',
  amount: '0',
  currencyCode: 'COP',
  startDate: '',
  endDate: '',
  status: 'draft' as ContractStatus,
  notes: '',
});
const { isDirty: isContractDirty, capture: captureContractForm } = useDirtyForm(() => ({
  ...contractForm,
}));

function openContract(contract?: Contract): void {
  Object.assign(contractForm, {
    id: contract?.id ?? '',
    code: contract?.code ?? '',
    name: contract?.name ?? '',
    contractType: contract?.contract_type ?? 'obra',
    partyId: contract?.party_id ?? '',
    amount: String(contract?.amount ?? 0),
    currencyCode: contract?.currency_code ?? defaultCurrency(),
    startDate: contract?.start_date?.slice(0, 10) ?? '',
    endDate: contract?.end_date?.slice(0, 10) ?? '',
    status: contract?.status ?? 'draft',
    notes: contract?.notes ?? '',
  });
  captureContractForm();
  formError.value = null;
  isContractOpen.value = true;
}

async function saveContract(): Promise<void> {
  if (!contractForm.code.trim() || !contractForm.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    const payload = {
      code: contractForm.code.trim(),
      name: contractForm.name.trim(),
      contractType: contractForm.contractType,
      partyId: contractForm.partyId || null,
      amount: Number(contractForm.amount) || 0,
      currencyCode: contractForm.currencyCode,
      startDate: contractForm.startDate || null,
      endDate: contractForm.endDate || null,
      status: contractForm.status,
      notes: contractForm.notes.trim() || null,
    };
    if (contractForm.id) {
      await executionService.updateContract(contractForm.id, payload);
    } else {
      await executionService.createContract(projectId.value, payload);
    }
    isContractOpen.value = false;
    contracts.value = await executionService.listContracts(projectId.value);
    toast.success('Contrato guardado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el contrato');
  } finally {
    isSaving.value = false;
  }
}

async function removeContract(id: string): Promise<void> {
  try {
    await executionService.deleteContract(id);
    contracts.value = await executionService.listContracts(projectId.value);
    toast.success('Contrato eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el contrato'));
  }
}

// --- Nómina ---
const payroll = ref<PayrollEntry[]>([]);
const isPayrollOpen = ref(false);
const payrollForm = reactive({
  id: '',
  workerName: '',
  membershipId: '',
  periodStart: '',
  periodEnd: '',
  days: '1',
  amount: '0',
  currencyCode: 'COP',
  status: 'draft' as PayrollStatus,
  notes: '',
});
const { isDirty: isPayrollDirty, capture: capturePayrollForm } = useDirtyForm(() => ({
  ...payrollForm,
}));

function openPayroll(entry?: PayrollEntry): void {
  Object.assign(payrollForm, {
    id: entry?.id ?? '',
    workerName: entry?.worker_name ?? '',
    membershipId: entry?.membership_id ?? '',
    periodStart: entry?.period_start?.slice(0, 10) ?? '',
    periodEnd: entry?.period_end?.slice(0, 10) ?? '',
    days: String(entry?.days ?? 1),
    amount: String(entry?.amount ?? 0),
    currencyCode: entry?.currency_code ?? defaultCurrency(),
    status: entry?.status ?? 'draft',
    notes: entry?.notes ?? '',
  });
  capturePayrollForm();
  formError.value = null;
  isPayrollOpen.value = true;
}

async function savePayroll(): Promise<void> {
  if (!payrollForm.workerName.trim() || !payrollForm.periodStart || !payrollForm.periodEnd) {
    formError.value = 'Trabajador y período son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    const payload = {
      workerName: payrollForm.workerName.trim(),
      membershipId: payrollForm.membershipId || null,
      periodStart: payrollForm.periodStart,
      periodEnd: payrollForm.periodEnd,
      days: Number(payrollForm.days) || 0,
      amount: Number(payrollForm.amount) || 0,
      currencyCode: payrollForm.currencyCode,
      status: payrollForm.status,
      notes: payrollForm.notes.trim() || null,
    };
    if (payrollForm.id) {
      await executionService.updatePayrollEntry(payrollForm.id, payload);
    } else {
      await executionService.createPayrollEntry(projectId.value, payload);
    }
    isPayrollOpen.value = false;
    payroll.value = await executionService.listPayroll(projectId.value);
    toast.success('Registro guardado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el registro');
  } finally {
    isSaving.value = false;
  }
}

async function removePayroll(id: string): Promise<void> {
  try {
    await executionService.deletePayrollEntry(id);
    payroll.value = await executionService.listPayroll(projectId.value);
    toast.success('Registro eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el registro'));
  }
}

// --- Almacén ---
const warehouses = ref<Warehouse[]>([]);
const movements = ref<StockMovement[]>([]);
const selectedWarehouseId = ref('');
const isWarehouseOpen = ref(false);
const isMovementOpen = ref(false);
const warehouseForm = reactive({
  id: '',
  code: '',
  name: '',
  location: '',
  isActive: 'true',
});
const { isDirty: isWarehouseDirty, capture: captureWarehouseForm } = useDirtyForm(() => ({
  ...warehouseForm,
}));
const movementForm = reactive({
  resourceId: '',
  movementType: 'in' as 'in' | 'out' | 'adjustment',
  quantity: '1',
  unitCost: '0',
  occurredAt: '',
  reference: '',
  notes: '',
});
const { isDirty: isMovementDirty, capture: captureMovementForm } = useDirtyForm(() => ({
  ...movementForm,
}));

const selectedWarehouse = computed(
  () => warehouses.value.find((warehouse) => warehouse.id === selectedWarehouseId.value) ?? null,
);

async function selectWarehouse(id: string): Promise<void> {
  selectedWarehouseId.value = id;
  isLoadingMovements.value = true;
  try {
    movements.value = await executionService.listMovements(id);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar los movimientos'));
  } finally {
    isLoadingMovements.value = false;
  }
}

function openWarehouse(warehouse?: Warehouse): void {
  Object.assign(warehouseForm, {
    id: warehouse?.id ?? '',
    code: warehouse?.code ?? '',
    name: warehouse?.name ?? '',
    location: warehouse?.location ?? '',
    isActive: warehouse?.is_active === false ? 'false' : 'true',
  });
  captureWarehouseForm();
  formError.value = null;
  isWarehouseOpen.value = true;
}

async function saveWarehouse(): Promise<void> {
  if (!warehouseForm.code.trim() || !warehouseForm.name.trim()) {
    formError.value = 'Código y nombre son obligatorios.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    const payload = {
      code: warehouseForm.code.trim(),
      name: warehouseForm.name.trim(),
      projectId: projectId.value,
      location: warehouseForm.location.trim() || null,
      isActive: warehouseForm.isActive === 'true',
    };
    if (warehouseForm.id) {
      await executionService.updateWarehouse(warehouseForm.id, payload);
    } else {
      const created = await executionService.createWarehouse(payload);
      selectedWarehouseId.value = created.id;
    }
    isWarehouseOpen.value = false;
    warehouses.value = await executionService.listWarehouses(projectId.value);
    if (selectedWarehouseId.value) await selectWarehouse(selectedWarehouseId.value);
    toast.success('Almacén guardado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar el almacén');
  } finally {
    isSaving.value = false;
  }
}

async function removeWarehouse(id: string): Promise<void> {
  try {
    await executionService.deleteWarehouse(id);
    if (selectedWarehouseId.value === id) {
      selectedWarehouseId.value = '';
      movements.value = [];
    }
    warehouses.value = await executionService.listWarehouses(projectId.value);
    toast.success('Almacén eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el almacén'));
  }
}

function openMovement(): void {
  Object.assign(movementForm, {
    resourceId: resources.value[0]?.id ?? '',
    movementType: 'in',
    quantity: '1',
    unitCost: '0',
    occurredAt: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });
  captureMovementForm();
  formError.value = null;
  isMovementOpen.value = true;
}

async function saveMovement(): Promise<void> {
  if (!selectedWarehouseId.value || !movementForm.resourceId) {
    formError.value = 'Selecciona un insumo.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    await executionService.createMovement(selectedWarehouseId.value, {
      resourceId: movementForm.resourceId,
      movementType: movementForm.movementType,
      quantity: Number(movementForm.quantity) || 0,
      unitCost: Number(movementForm.unitCost) || 0,
      occurredAt: movementForm.occurredAt || null,
      reference: movementForm.reference.trim() || null,
      notes: movementForm.notes.trim() || null,
    });
    isMovementOpen.value = false;
    movements.value = await executionService.listMovements(selectedWarehouseId.value);
    toast.success('Movimiento registrado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos registrar el movimiento');
  } finally {
    isSaving.value = false;
  }
}

async function removeMovement(id: string): Promise<void> {
  try {
    await executionService.deleteMovement(id);
    if (selectedWarehouseId.value) {
      movements.value = await executionService.listMovements(selectedWarehouseId.value);
    }
    toast.success('Movimiento eliminado');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar el movimiento'));
  }
}

// --- Compras ---
const purchaseOrders = ref<PurchaseOrder[]>([]);
const purchaseDetail = ref<PurchaseOrderDetail | null>(null);

const scheduleTable = useAppTable<ScheduleActivity>({
  columns: useScheduleColumns(),
  data: computed(() => schedule.value),
});
const contractTable = useAppTable<Contract>({
  columns: useContractColumns(),
  data: computed(() => contracts.value),
});
const payrollTable = useAppTable<PayrollEntry>({
  columns: usePayrollColumns(),
  data: computed(() => payroll.value),
});
const warehouseTable = useAppTable<Warehouse>({
  columns: useWarehouseColumns(),
  data: computed(() => warehouses.value),
});
const movementTable = useAppTable<StockMovement>({
  columns: useMovementColumns(),
  data: computed(() => movements.value),
});
const purchaseTable = useAppTable<PurchaseOrder>({
  columns: usePurchaseColumns(),
  data: computed(() => purchaseOrders.value),
});
const purchaseLineTable = useAppTable<PurchaseOrderLine>({
  columns: usePurchaseLineColumns(),
  data: computed(() => purchaseDetail.value?.lines ?? []),
});
const purchaseStatusDraft = ref<PurchaseOrderStatus>('draft');
const isPurchaseOpen = ref(false);
const isPurchaseDetailOpen = ref(false);
const purchaseForm = reactive({
  code: '',
  supplierPartyId: '',
  currencyCode: 'COP',
  status: 'draft' as PurchaseOrderStatus,
  notes: '',
  lines: [] as Array<{
    resourceId: string;
    description: string;
    quantity: string;
    unitPrice: string;
  }>,
});
const { isDirty: isPurchaseDirty, capture: capturePurchaseForm } = useDirtyForm(() => ({
  ...purchaseForm,
  lines: purchaseForm.lines.map((line) => ({ ...line })),
}));
const purchaseTotal = computed(() =>
  purchaseForm.lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    0,
  ),
);

function addPurchaseLine(): void {
  purchaseForm.lines.push({ resourceId: '', description: '', quantity: '1', unitPrice: '0' });
}

function removePurchaseLine(index: number): void {
  if (purchaseForm.lines.length > 1) purchaseForm.lines.splice(index, 1);
}

function openPurchase(): void {
  Object.assign(purchaseForm, {
    code: '',
    supplierPartyId: '',
    currencyCode: defaultCurrency(),
    status: 'draft',
    notes: '',
    lines: [{ resourceId: '', description: '', quantity: '1', unitPrice: '0' }],
  });
  capturePurchaseForm();
  formError.value = null;
  isPurchaseOpen.value = true;
}

async function savePurchase(): Promise<void> {
  if (!purchaseForm.code.trim()) {
    formError.value = 'El código es obligatorio.';
    return;
  }
  const lines: PurchaseOrderLinePayload[] = purchaseForm.lines
    .filter((line) => line.description.trim() || line.resourceId)
    .map((line) => ({
      resourceId: line.resourceId || null,
      description: line.description.trim() || resources.value.find((resource) => resource.id === line.resourceId)?.name || 'Insumo',
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
    }));
  if (lines.length === 0) {
    formError.value = 'Agrega al menos una línea.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    await executionService.createPurchaseOrder(projectId.value, {
      code: purchaseForm.code.trim(),
      supplierPartyId: purchaseForm.supplierPartyId || null,
      currencyCode: purchaseForm.currencyCode,
      status: purchaseForm.status,
      notes: purchaseForm.notes.trim() || null,
      lines,
    });
    isPurchaseOpen.value = false;
    purchaseOrders.value = await executionService.listPurchaseOrders(projectId.value);
    toast.success('Orden de compra creada');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos crear la orden');
  } finally {
    isSaving.value = false;
  }
}

async function openPurchaseDetail(id: string): Promise<void> {
  try {
    purchaseDetail.value = await executionService.getPurchaseOrder(id);
    purchaseStatusDraft.value = purchaseDetail.value.status;
    formError.value = null;
    isPurchaseDetailOpen.value = true;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar la orden'));
  }
}

async function savePurchaseStatus(): Promise<void> {
  if (!purchaseDetail.value) return;
  isSaving.value = true;
  formError.value = null;
  try {
    purchaseDetail.value = await executionService.updatePurchaseOrder(purchaseDetail.value.id, {
      status: purchaseStatusDraft.value,
    });
    purchaseOrders.value = await executionService.listPurchaseOrders(projectId.value);
    isPurchaseDetailOpen.value = false;
    toast.success('Estado de la orden actualizado');
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos actualizar la orden');
  } finally {
    isSaving.value = false;
  }
}

async function removePurchase(id: string): Promise<void> {
  try {
    await executionService.deletePurchaseOrder(id);
    purchaseOrders.value = await executionService.listPurchaseOrders(projectId.value);
    toast.success('Orden eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la orden'));
  }
}

onMounted(async () => {
  isLoading.value = true;
  try {
    project.value = await projectService.get(projectId.value);
    await loadLookups();
    await loadSection(activeTab.value);
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar la ejecución del proyecto');
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.execution-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.execution-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.execution-tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.execution-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
}

.execution-tab:hover {
  color: var(--text-main);
  background: var(--bg-hover);
}

.execution-tab.is-active {
  color: var(--text-main);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.execution-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.execution-title {
  margin: 0;
  font-size: var(--text-base);
}

.execution-hint {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.execution-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.schedule-head,
.schedule-row,
.contracts-head,
.contracts-row,
.payroll-head,
.payroll-row,
.movements-head,
.movements-row,
.purchases-head,
.purchases-row,
.po-detail-head,
.po-detail-row {
  display: grid;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.schedule-head,
.schedule-row {
  grid-template-columns: minmax(170px, 1fr) 90px 90px 150px 110px minmax(120px, 1fr) 150px;
  min-width: 980px;
}

.contracts-head,
.contracts-row {
  grid-template-columns: 70px minmax(160px, 1fr) 130px 100px 120px 160px 100px 150px;
  min-width: 1100px;
}

.payroll-head,
.payroll-row {
  grid-template-columns: minmax(150px, 1fr) 180px 65px 120px 100px minmax(100px, 1fr) 150px;
  min-width: 980px;
}

.movements-head,
.movements-row {
  grid-template-columns: 90px minmax(170px, 1fr) 80px 120px 110px minmax(100px, 1fr) 90px;
  min-width: 900px;
}

.purchases-head,
.purchases-row {
  grid-template-columns: 80px minmax(150px, 1fr) 60px 120px 100px 100px 140px;
  min-width: 880px;
}

.po-detail-head,
.po-detail-row {
  grid-template-columns: 90px minmax(180px, 1fr) 100px 120px 120px;
  min-width: 640px;
}

.schedule-head,
.contracts-head,
.payroll-head,
.movements-head,
.purchases-head,
.po-detail-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.schedule-row,
.contracts-row,
.payroll-row,
.movements-row,
.purchases-row,
.po-detail-row {
  border-top: 1px solid var(--border);
}

.cell-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.cell-muted {
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.cell-amount {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.cell-actions {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.progress-track {
  display: inline-block;
  width: 80px;
  height: 6px;
  margin-right: var(--space-1);
  border-radius: 999px;
  background: var(--bg-hover);
  overflow: hidden;
  vertical-align: middle;
}

.progress-fill {
  display: block;
  height: 100%;
  background: var(--primary);
}

.execution-empty {
  padding: var(--space-5);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.danger-action {
  color: var(--color-danger);
}

.warehouse-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.warehouse-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.warehouse-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
}

.warehouse-list li:hover {
  background: var(--bg-hover);
}

.warehouse-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-main);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.warehouse-item.is-active {
  border-color: var(--border);
  background: var(--bg-hover);
}

.warehouse-name {
  font-size: var(--text-sm);
  font-weight: 600;
}

.warehouse-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.warehouse-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: var(--space-1);
}

.po-lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.po-lines-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-2);
}

.po-lines-total {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.po-lines-total strong {
  color: var(--text-main);
}

.po-lines-head,
.po-line {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(160px, 1fr) 90px 110px auto;
  gap: var(--space-2);
  align-items: center;
}

.po-lines-head {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 600;
}

.po-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}

@media (max-width: 1000px) {
  .warehouse-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .po-lines-head {
    display: none;
  }

  .po-line {
    grid-template-columns: 1fr;
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
}
</style>
