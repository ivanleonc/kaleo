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
        </template>
      </UiPageHeader>

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div v-if="isLoading" class="execution-loading" aria-hidden="true">
        <UiSkeleton variant="title" width="260px" />
        <UiSkeleton v-for="n in 5" :key="n" variant="text" width="100%" />
      </div>

      <template v-else>
        <nav class="execution-tabs" aria-label="Secciones de ejecución">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="execution-tab"
            :class="{ 'is-active': activeTab === tab.id }"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="selectTab(tab.id)"
          >
            <component :is="tab.icon" :size="16" stroke-width="1.8" aria-hidden="true" />
            {{ tab.label }}
          </button>
        </nav>

        <!-- Programación -->
        <UiCard v-if="activeTab === 'schedule'">
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Programación de obra</h2>
              <p class="execution-hint">Cronograma de actividades y avance físico.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openSchedule()">
              <IconPlus :size="16" /> Actividad
            </UiButton>
          </div>

          <div v-if="isLoadingSection" class="execution-loading" aria-hidden="true">
            <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
          </div>
          <div v-else class="execution-table">
            <div class="schedule-head">
              <span>Actividad</span><span>Inicio</span><span>Fin</span><span>Avance</span>
              <span>Estado</span><span>Notas</span><span></span>
            </div>
            <div v-for="activity in schedule" :key="activity.id" class="schedule-row">
              <span class="cell-name">{{ activity.name }}</span>
              <span>{{ activity.start_date ? formatDate(activity.start_date) : '—' }}</span>
              <span>{{ activity.end_date ? formatDate(activity.end_date) : '—' }}</span>
              <span>
                <span class="progress-track">
                  <span class="progress-fill" :style="{ width: `${activity.progress_pct}%` }"></span>
                </span>
                {{ activity.progress_pct }}%
              </span>
              <span>
                <UiBadge
                  :label="scheduleStatusLabel(activity.status)"
                  :variant="scheduleStatusVariant(activity.status)"
                  size="sm"
                />
              </span>
              <span class="cell-muted">{{ activity.notes || '—' }}</span>
              <span class="cell-actions">
                <UiButton
                  v-permission="Permissions.EXECUTION.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openSchedule(activity)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-permission="Permissions.EXECUTION.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmRemove(`¿Eliminar la actividad ${activity.name}?`, () => removeSchedule(activity.id))"
                >
                  Eliminar
                </UiButton>
              </span>
            </div>
            <p v-if="schedule.length === 0" class="execution-empty">
              Todavía no hay actividades programadas.
            </p>
          </div>
        </UiCard>

        <!-- Contratos -->
        <UiCard v-else-if="activeTab === 'contracts'">
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Contratos</h2>
              <p class="execution-hint">Contratos de obra, subcontratos, servicios y suministros.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openContract()">
              <IconPlus :size="16" /> Contrato
            </UiButton>
          </div>

          <div v-if="isLoadingSection" class="execution-loading" aria-hidden="true">
            <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
          </div>
          <div v-else class="execution-table">
            <div class="contracts-head">
              <span>Código</span><span>Contrato</span><span>Tercero</span><span>Tipo</span>
              <span>Valor</span><span>Vigencia</span><span>Estado</span><span></span>
            </div>
            <div v-for="contract in contracts" :key="contract.id" class="contracts-row">
              <span class="cell-muted">{{ contract.code }}</span>
              <span class="cell-name">{{ contract.name }}</span>
              <span>{{ contract.party_name || '—' }}</span>
              <span>{{ contractTypeLabel(contract.contract_type) }}</span>
              <span class="cell-amount">{{ formatMoney(contract.amount, contract.currency_code) }}</span>
              <span>
                {{ contract.start_date ? formatDate(contract.start_date) : '—' }} →
                {{ contract.end_date ? formatDate(contract.end_date) : '—' }}
              </span>
              <span>
                <UiBadge
                  :label="contractStatusLabel(contract.status)"
                  :variant="contractStatusVariant(contract.status)"
                  size="sm"
                />
              </span>
              <span class="cell-actions">
                <UiButton
                  v-permission="Permissions.EXECUTION.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openContract(contract)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-permission="Permissions.EXECUTION.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmRemove(`¿Eliminar el contrato ${contract.code}?`, () => removeContract(contract.id))"
                >
                  Eliminar
                </UiButton>
              </span>
            </div>
            <p v-if="contracts.length === 0" class="execution-empty">Todavía no hay contratos.</p>
          </div>
        </UiCard>

        <!-- Nómina -->
        <UiCard v-else-if="activeTab === 'payroll'">
          <div class="execution-heading">
            <div>
              <h2 class="execution-title">Nómina de obra</h2>
              <p class="execution-hint">Registros de pago por trabajador y período.</p>
            </div>
            <UiButton v-permission="Permissions.EXECUTION.CREATE" width="auto" @click="openPayroll()">
              <IconPlus :size="16" /> Registro
            </UiButton>
          </div>

          <div v-if="isLoadingSection" class="execution-loading" aria-hidden="true">
            <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
          </div>
          <div v-else class="execution-table">
            <div class="payroll-head">
              <span>Trabajador</span><span>Período</span><span>Días</span><span>Valor</span>
              <span>Estado</span><span>Notas</span><span></span>
            </div>
            <div v-for="entry in payroll" :key="entry.id" class="payroll-row">
              <span class="cell-name">{{ entry.worker_name }}</span>
              <span>{{ formatDate(entry.period_start) }} → {{ formatDate(entry.period_end) }}</span>
              <span class="cell-amount">{{ formatNumber(entry.days, 2) }}</span>
              <span class="cell-amount">{{ formatMoney(entry.amount, entry.currency_code) }}</span>
              <span>
                <UiBadge
                  :label="payrollStatusLabel(entry.status)"
                  :variant="payrollStatusVariant(entry.status)"
                  size="sm"
                />
              </span>
              <span class="cell-muted">{{ entry.notes || '—' }}</span>
              <span class="cell-actions">
                <UiButton
                  v-permission="Permissions.EXECUTION.UPDATE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  @click="openPayroll(entry)"
                >
                  Editar
                </UiButton>
                <UiButton
                  v-permission="Permissions.EXECUTION.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmRemove(`¿Eliminar el registro de ${entry.worker_name}?`, () => removePayroll(entry.id))"
                >
                  Eliminar
                </UiButton>
              </span>
            </div>
            <p v-if="payroll.length === 0" class="execution-empty">Todavía no hay registros de nómina.</p>
          </div>
        </UiCard>

        <!-- Almacén -->
        <div v-else-if="activeTab === 'warehouse'" class="warehouse-layout">
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

            <div v-if="isLoadingSection" class="execution-loading" aria-hidden="true">
              <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
            </div>
            <ul v-else class="warehouse-list">
              <li v-for="warehouse in warehouses" :key="warehouse.id">
                <button
                  type="button"
                  class="warehouse-item"
                  :class="{ 'is-active': selectedWarehouseId === warehouse.id }"
                  @click="selectWarehouse(warehouse.id)"
                >
                  <span class="warehouse-name">{{ warehouse.code }} · {{ warehouse.name }}</span>
                  <span class="warehouse-meta">
                    {{ warehouse.location || 'Sin ubicación' }} ·
                    {{ warehouse.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </button>
                <span class="warehouse-actions">
                  <UiButton
                    v-permission="Permissions.EXECUTION.UPDATE"
                    size="sm"
                    variant="ghost"
                    width="auto"
                    @click="openWarehouse(warehouse)"
                  >
                    Editar
                  </UiButton>
                  <UiButton
                    v-permission="Permissions.EXECUTION.DELETE"
                    size="sm"
                    variant="ghost"
                    width="auto"
                    class="danger-action"
                    @click="confirmRemove(`¿Eliminar el almacén ${warehouse.code}?`, () => removeWarehouse(warehouse.id))"
                  >
                    Eliminar
                  </UiButton>
                </span>
              </li>
              <li v-if="warehouses.length === 0" class="execution-empty">
                Todavía no hay almacenes. Crea el primero para registrar movimientos.
              </li>
            </ul>
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

            <div v-if="!selectedWarehouse" class="execution-empty">Selecciona un almacén de la lista.</div>
            <div v-else-if="isLoadingMovements" class="execution-loading" aria-hidden="true">
              <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
            </div>
            <div v-else class="execution-table">
              <div class="movements-head">
                <span>Fecha</span><span>Insumo</span><span>Tipo</span><span>Cantidad</span>
                <span>Costo unitario</span><span>Referencia</span><span></span>
              </div>
              <div v-for="movement in movements" :key="movement.id" class="movements-row">
                <span>{{ formatDate(movement.occurred_at) }}</span>
                <span class="cell-name">{{ movement.resource_code }} · {{ movement.resource_name }}</span>
                <span>{{ movementTypeLabel(movement.movement_type) }}</span>
                <span class="cell-amount">{{ formatNumber(movement.quantity, 4) }} {{ movement.unit_code }}</span>
                <span class="cell-amount">{{ formatMoney(movement.unit_cost, project?.currency_code) }}</span>
                <span class="cell-muted">{{ movement.reference || '—' }}</span>
                <span class="cell-actions">
                  <UiButton
                    v-permission="Permissions.EXECUTION.DELETE"
                    size="sm"
                    variant="ghost"
                    width="auto"
                    class="danger-action"
                    @click="confirmRemove('¿Eliminar este movimiento?', () => removeMovement(movement.id))"
                  >
                    Eliminar
                  </UiButton>
                </span>
              </div>
              <p v-if="movements.length === 0" class="execution-empty">Sin movimientos registrados.</p>
            </div>
          </UiCard>
        </div>

        <!-- Compras -->
        <UiCard v-else-if="activeTab === 'purchases'">
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
          <div v-else class="execution-table">
            <div class="purchases-head">
              <span>Código</span><span>Proveedor</span><span>Líneas</span><span>Total</span>
              <span>Estado</span><span>Creada</span><span></span>
            </div>
            <div v-for="order in purchaseOrders" :key="order.id" class="purchases-row">
              <span class="cell-muted">{{ order.code }}</span>
              <span class="cell-name">{{ order.supplier_name || 'Sin proveedor' }}</span>
              <span class="cell-amount">{{ order.lines_count }}</span>
              <span class="cell-amount">{{ formatMoney(order.total, order.currency_code) }}</span>
              <span>
                <UiBadge
                  :label="purchaseStatusLabel(order.status)"
                  :variant="purchaseStatusVariant(order.status)"
                  size="sm"
                />
              </span>
              <span>{{ formatDate(order.created_at) }}</span>
              <span class="cell-actions">
                <UiButton size="sm" variant="ghost" width="auto" @click="openPurchaseDetail(order.id)">
                  Ver
                </UiButton>
                <UiButton
                  v-permission="Permissions.EXECUTION.DELETE"
                  size="sm"
                  variant="ghost"
                  width="auto"
                  class="danger-action"
                  @click="confirmRemove(`¿Eliminar la orden ${order.code}?`, () => removePurchase(order.id))"
                >
                  Eliminar
                </UiButton>
              </span>
            </div>
            <p v-if="purchaseOrders.length === 0" class="execution-empty">
              Todavía no hay órdenes de compra.
            </p>
          </div>
        </UiCard>
      </template>
    </div>

    <!-- Programación -->
    <UiFormModal
      v-model="isScheduleOpen"
      :title="scheduleForm.id ? 'Editar actividad' : 'Nueva actividad'"
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      @submit="saveSchedule"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="scheduleForm.name" label="Actividad" required class="span-2" />
        <UiInput v-model="scheduleForm.startDate" label="Inicio" type="date" />
        <UiInput v-model="scheduleForm.endDate" label="Fin" type="date" />
        <UiInput v-model="scheduleForm.progressPct" label="Avance %" type="number" />
        <UiSelect v-model="scheduleForm.status" label="Estado" :options="scheduleStatusOptions" :clearable="false" />
        <UiInput v-model="scheduleForm.notes" label="Notas" class="span-2" />
      </div>
    </UiFormModal>

    <!-- Contratos -->
    <UiFormModal
      v-model="isContractOpen"
      :title="contractForm.id ? 'Editar contrato' : 'Nuevo contrato'"
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      @submit="saveContract"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="contractForm.code" label="Código" required />
        <UiSelect v-model="contractForm.contractType" label="Tipo" :options="contractTypeOptions" :clearable="false" />
        <UiInput v-model="contractForm.name" label="Nombre" required class="span-2" />
        <UiSelect v-model="contractForm.partyId" label="Tercero" :options="partyOptions" />
        <UiInput v-model="contractForm.amount" label="Valor" type="number" />
        <UiSelect v-model="contractForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
        <UiSelect v-model="contractForm.status" label="Estado" :options="contractStatusOptions" :clearable="false" />
        <UiInput v-model="contractForm.startDate" label="Inicio" type="date" />
        <UiInput v-model="contractForm.endDate" label="Fin" type="date" />
        <UiInput v-model="contractForm.notes" label="Notas" class="span-2" />
      </div>
    </UiFormModal>

    <!-- Nómina -->
    <UiFormModal
      v-model="isPayrollOpen"
      :title="payrollForm.id ? 'Editar registro de nómina' : 'Nuevo registro de nómina'"
      submit-label="Guardar"
      size="large"
      :loading="isSaving"
      @submit="savePayroll"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="payrollForm.workerName" label="Trabajador" required class="span-2" />
        <UiSelect v-model="payrollForm.membershipId" label="Miembro del equipo" :options="memberOptions" />
        <UiSelect v-model="payrollForm.status" label="Estado" :options="payrollStatusOptions" :clearable="false" />
        <UiInput v-model="payrollForm.periodStart" label="Desde" type="date" required />
        <UiInput v-model="payrollForm.periodEnd" label="Hasta" type="date" required />
        <UiInput v-model="payrollForm.days" label="Días" type="number" />
        <UiInput v-model="payrollForm.amount" label="Valor" type="number" />
        <UiSelect v-model="payrollForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
        <UiInput v-model="payrollForm.notes" label="Notas" class="span-2" />
      </div>
    </UiFormModal>

    <!-- Almacén -->
    <UiFormModal
      v-model="isWarehouseOpen"
      :title="warehouseForm.id ? 'Editar almacén' : 'Nuevo almacén'"
      submit-label="Guardar"
      :loading="isSaving"
      @submit="saveWarehouse"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="warehouseForm.code" label="Código" required />
        <UiInput v-model="warehouseForm.name" label="Nombre" required class="span-2" />
        <UiInput v-model="warehouseForm.location" label="Ubicación" class="span-2" />
        <UiSelect v-model="warehouseForm.isActive" label="Estado" :options="activeOptions" :clearable="false" />
      </div>
    </UiFormModal>

    <UiFormModal
      v-model="isMovementOpen"
      title="Registrar movimiento"
      submit-label="Registrar"
      size="large"
      :loading="isSaving"
      @submit="saveMovement"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiSelect v-model="movementForm.resourceId" label="Insumo" :options="resourceOptions" searchable class="span-2" />
        <UiSelect v-model="movementForm.movementType" label="Tipo" :options="movementTypeOptions" :clearable="false" />
        <UiInput v-model="movementForm.quantity" label="Cantidad" type="number" required />
        <UiInput v-model="movementForm.unitCost" label="Costo unitario" type="number" />
        <UiInput v-model="movementForm.occurredAt" label="Fecha" type="date" />
        <UiInput v-model="movementForm.reference" label="Referencia" />
        <UiInput v-model="movementForm.notes" label="Notas" />
      </div>
    </UiFormModal>

    <!-- Orden de compra -->
    <UiFormModal
      v-model="isPurchaseOpen"
      title="Nueva orden de compra"
      submit-label="Crear orden"
      size="large"
      :loading="isSaving"
      @submit="savePurchase"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <div class="form-grid">
        <UiInput v-model="purchaseForm.code" label="Código" required />
        <UiSelect v-model="purchaseForm.supplierPartyId" label="Proveedor" :options="supplierOptions" />
        <UiSelect v-model="purchaseForm.currencyCode" label="Moneda" :options="currencyOptions" :clearable="false" />
        <UiSelect v-model="purchaseForm.status" label="Estado" :options="purchaseStatusOptions" :clearable="false" />
        <UiInput v-model="purchaseForm.notes" label="Notas" class="span-2" />
      </div>

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
        <UiButton size="sm" variant="outline" width="auto" @click="addPurchaseLine">
          <IconPlus :size="15" /> Línea
        </UiButton>
      </div>
    </UiFormModal>

    <!-- Detalle orden de compra -->
    <UiFormModal
      v-model="isPurchaseDetailOpen"
      title="Orden de compra"
      submit-label="Guardar estado"
      size="large"
      :loading="isSaving"
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
        <div class="execution-table">
          <div class="po-detail-head">
            <span>Insumo</span><span>Descripción</span><span>Cantidad</span><span>Valor unitario</span><span>Valor</span>
          </div>
          <div v-for="line in purchaseDetail.lines" :key="line.id" class="po-detail-row">
            <span>{{ line.resource_code || '—' }}</span>
            <span class="cell-name">{{ line.description }}</span>
            <span class="cell-amount">{{ formatNumber(line.quantity, 4) }}</span>
            <span class="cell-amount">{{ formatMoney(line.unit_price, purchaseDetail.currency_code) }}</span>
            <span class="cell-amount">{{ formatMoney(line.amount, purchaseDetail.currency_code) }}</span>
          </div>
        </div>
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
import { executionService } from '@/services/execution.service';
import { projectService } from '@/services/project.service';
import { catalogService } from '@/services/catalog.service';
import { memberService } from '@/services/member.service';
import { partyService } from '@/services/party.service';
import { estimatingService } from '@/services/estimating.service';
import { apiErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import { Permissions } from '@/constants/permissions';
import type { Project } from '@/types/project';
import type { Currency } from '@/types/catalog';
import type { Member } from '@/types/member';
import type { PartyListItem } from '@/types/party';
import type { Resource } from '@/types/estimating';
import type {
  Contract,
  ContractStatus,
  ContractType,
  PayrollEntry,
  PayrollStatus,
  PurchaseOrder,
  PurchaseOrderDetail,
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

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value);
}

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

function scheduleStatusLabel(status: ScheduleStatus): string {
  return {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
    delayed: 'Retrasada',
  }[status];
}

function scheduleStatusVariant(status: ScheduleStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return {
    pending: 'neutral',
    in_progress: 'info',
    completed: 'success',
    delayed: 'danger',
  }[status] as 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

function contractTypeLabel(type: ContractType): string {
  return contractTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function contractStatusLabel(status: ContractStatus): string {
  return contractStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function contractStatusVariant(status: ContractStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return {
    draft: 'neutral',
    active: 'info',
    completed: 'success',
    terminated: 'danger',
  }[status] as 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

function payrollStatusLabel(status: PayrollStatus): string {
  return payrollStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function payrollStatusVariant(status: PayrollStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return {
    draft: 'neutral',
    paid: 'success',
    cancelled: 'danger',
  }[status] as 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

function movementTypeLabel(type: StockMovement['movement_type']): string {
  return movementTypeOptions.find((option) => option.value === type)?.label ?? type;
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
const movementForm = reactive({
  resourceId: '',
  movementType: 'in' as 'in' | 'out' | 'adjustment',
  quantity: '1',
  unitCost: '0',
  occurredAt: '',
  reference: '',
  notes: '',
});

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
  margin-top: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
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
