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
          <UiTableColumnMenu v-if="budget && activeTab === 'budget'" :table="budgetTable" />
          <UiTableColumnMenu v-else-if="activeTab === 'materials'" :table="materialTable" />
          <UiTableColumnMenu v-else-if="activeTab === 'versions'" :table="versionTable" />
          <UiTableColumnMenu v-else-if="activeTab === 'takeoff'" :table="takeoffLineTable" />
          <UiButton
            v-if="!budget || editable"
            variant="outline"
            width="auto"
            @click="openImport"
          >
            <IconFileImport :size="16" /> Importar
          </UiButton>
          <UiButton v-if="budget" variant="outline" width="auto" @click="printReport">
            <IconPrinter :size="16" /> Reporte
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
        <UiTabs
          v-model="activeTabModel"
          :tabs="budgetTabItems"
          group-label="Secciones del presupuesto"
          scrollable
          panel-id-prefix="budget"
        />

        <div
          v-if="activeTab === 'budget'"
          id="budget-panel-budget"
          role="tabpanel"
          aria-labelledby="budget-tab-budget"
        >
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
              <UiExportMenu :fetcher="exportBudgetFile" label="Exportar" />
              <UiSearchInput v-model="search" placeholder="Buscar actividad..." aria-label="Buscar actividades" />
            </div>
          </div>

          <BudgetItemsTable
            :table="budgetTable"
            :editable="editable"
            :currency="budget.currency_code"
            :expanded="expanded"
            error-title="No pudimos cargar las actividades"
            :empty-title="search.trim() ? 'Sin actividades que coincidan' : 'El presupuesto está vacío'"
            :empty-description="
              search.trim()
                ? 'Ajusta la búsqueda o limpia el filtro.'
                : 'Agrega un capítulo, una actividad manual o importa actividades desde APUs.'
            "
            @retry="load"
            @toggle="toggleChapter"
            @view-apu="openApu"
            @edit="openEdit"
            @delete="confirmDelete"
            @update-quantity="(id, value) => updateItem(id, { quantity: value })"
            @update-price="(id, value) => updateItem(id, { unitPrice: value })"
          >
            <template #empty-action>
              <UiButton v-if="editable" variant="outline" width="auto" @click="openChapter">
                <IconPlus :size="15" /> Capítulo
              </UiButton>
              <UiButton v-if="editable" width="auto" @click="openApus">
                <IconStack2 :size="15" /> Desde APUs
              </UiButton>
            </template>
          </BudgetItemsTable>

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
        </div>

        <!-- Insumos -->
        <div
          v-else-if="activeTab === 'materials'"
          id="budget-panel-materials"
          role="tabpanel"
          aria-labelledby="budget-tab-materials"
        >
          <UiCard>
            <div class="section-heading">
              <div>
                <h2 class="section-title">Listado total de insumos</h2>
                <p class="section-hint">
                  Cantidades y costos consolidados de todos los APUs del presupuesto v{{ budget.version }}.
                </p>
              </div>
              <div class="section-actions">
                <UiExportMenu
                  :fetcher="exportMaterialsFile"
                  label="Exportar insumos"
                  :disabled="materials.length === 0"
                />
                <UiButton size="sm" variant="outline" width="auto" @click="printReport">
                  <IconPrinter :size="16" /> Imprimir / PDF
                </UiButton>
              </div>
            </div>

            <MaterialsTable
              :table="materialTable"
              :loading="isLoadingMaterials"
              error-title="No pudimos cargar los insumos"
              empty-title="Sin insumos consolidados"
              empty-description="Agrega actividades desde APUs para consolidar cantidades y costos aquí."
              @retry="loadMaterials"
            >
              <template #empty-action>
                <UiButton v-if="editable" width="auto" @click="openApus">
                  <IconStack2 :size="15" /> Desde APUs
                </UiButton>
              </template>
            </MaterialsTable>
          </UiCard>
        </div>

        <!-- Versiones -->
        <div
          v-else-if="activeTab === 'versions'"
          id="budget-panel-versions"
          role="tabpanel"
          aria-labelledby="budget-tab-versions"
        >
          <UiCard>
            <div class="section-heading">
              <div>
                <h2 class="section-title">Versiones del presupuesto</h2>
                <p class="section-hint">
                  Abre una versión, compara cambios y crea una nueva a partir de un presupuesto
                  aprobado.
                </p>
              </div>
              <UiButton
                v-if="budget.status === 'approved' || budget.status === 'superseded'"
                width="auto"
                @click="openVersionModal"
              >
                <IconVersions :size="16" /> Nueva versión
              </UiButton>
            </div>

            <VersionsTable
              :table="versionTable"
              :current-id="budget.id"
              :currency="budget.currency_code"
              :loading="isLoadingVersions"
              error-title="No pudimos cargar las versiones"
              empty-title="Sin versiones registradas"
              empty-description="La versión actual aparecerá aquí cuando se cree el historial."
              @retry="loadVersions"
              @open="openVersion"
            />

            <div v-if="editable" class="version-label">
              <UiInput
                v-model="versionLabelDraft"
                label="Etiqueta de la versión actual"
                placeholder="Rev A, Entregado al cliente…"
              />
              <UiButton
                size="sm"
                variant="outline"
                width="auto"
                :loading="isSavingLabel"
                @click="saveVersionLabel"
              >
                Guardar etiqueta
              </UiButton>
            </div>

            <div class="compare-section">
              <h3 class="section-subtitle">
                <IconGitCompare :size="16" aria-hidden="true" /> Comparar versiones
              </h3>
              <div class="compare-controls">
                <UiSelect v-model="compareBaseId" label="Versión base" :options="versionOptions" />
                <UiSelect v-model="compareTargetId" label="Versión a comparar" :options="versionOptions" />
                <UiButton
                  width="auto"
                  :loading="isComparing"
                  :disabled="!compareBaseId || !compareTargetId || compareBaseId === compareTargetId"
                  @click="runCompare"
                >
                  Comparar
                </UiButton>
              </div>

              <template v-if="compareResult">
                <div class="compare-totals">
                  <span>
                    Base v{{ compareResult.base.version }}:
                    <strong>{{ formatMoney(compareResult.totals.base_total, budget.currency_code) }}</strong>
                  </span>
                  <span>
                    Comparada v{{ compareResult.target.version }}:
                    <strong>{{ formatMoney(compareResult.totals.target_total, budget.currency_code) }}</strong>
                  </span>
                  <span :class="compareResult.totals.delta >= 0 ? 'delta-up' : 'delta-down'">
                    Diferencia: <strong>{{ formatMoney(compareResult.totals.delta, budget.currency_code) }}</strong>
                  </span>
                </div>

                <CompareTable
                  :table="compareTable"
                  :currency="budget.currency_code"
                  empty-title="Sin diferencias"
                  empty-description="Las versiones comparadas no tienen actividades para mostrar."
                />
              </template>
            </div>
          </UiCard>
        </div>

        <!-- Takeoff -->
        <div
          v-else-if="activeTab === 'takeoff'"
          id="budget-panel-takeoff"
          role="tabpanel"
          aria-labelledby="budget-tab-takeoff"
        >
          <div class="takeoff-layout">
            <UiCard>
              <div class="section-heading">
                <div>
                  <h2 class="section-title">Hojas de takeoff</h2>
                  <p class="section-hint">Mediciones detalladas por actividad del presupuesto.</p>
                </div>
                <UiButton v-if="editable" size="sm" width="auto" @click="openTakeoffSheet">
                  <IconPlus :size="16" /> Hoja
                </UiButton>
              </div>

              <div v-if="isLoadingTakeoff" class="budget-loading" aria-hidden="true">
                <UiSkeleton v-for="n in 3" :key="n" variant="text" width="100%" />
              </div>
              <ul v-else class="takeoff-sheets">
                <li v-for="sheet in takeoffSheets" :key="sheet.id">
                  <button
                    type="button"
                    class="takeoff-sheet"
                    :class="{ 'is-active': takeoffDetail?.id === sheet.id }"
                    @click="openTakeoffSheetDetail(sheet.id)"
                  >
                    <span class="takeoff-sheet-name">{{ sheet.name }}</span>
                    <span class="takeoff-sheet-meta">
                      {{ sheet.budget_item_name || 'Sin actividad' }} ·
                      {{ formatNumber(sheet.total_quantity, 4) }}
                    </span>
                    <UiBadge
                      :label="sheet.status === 'confirmed' ? 'Confirmada' : 'Borrador'"
                      :variant="sheet.status === 'confirmed' ? 'success' : 'neutral'"
                      size="sm"
                    />
                  </button>
                </li>
                <li v-if="takeoffSheets.length === 0" class="budget-empty">
                  Todavía no hay hojas de takeoff. Crea una para medir cantidades por dimensiones.
                </li>
              </ul>
            </UiCard>

            <UiCard v-if="takeoffDetail">
              <div class="section-heading">
                <div>
                  <h2 class="section-title">{{ takeoffDetail.name }}</h2>
                  <p class="section-hint">
                    {{ takeoffDetail.budget_item_name || 'Sin actividad vinculada' }} ·
                    {{ formatNumber(takeoffDetail.total_quantity, 4) }}
                    {{ takeoffDetail.lines[0]?.unit_code || '' }}
                  </p>
                </div>
                <div class="section-actions">
                  <UiButton v-if="editable" size="sm" variant="outline" width="auto" @click="openTakeoffLine()">
                    <IconPlus :size="15" /> Línea
                  </UiButton>
                  <UiButton
                    v-if="editable && takeoffDetail.budget_item_id"
                    size="sm"
                    width="auto"
                    :disabled="takeoffDetail.lines.length === 0"
                    @click="isApplyTakeoffOpen = true"
                  >
                    Aplicar al presupuesto
                  </UiButton>
                  <UiButton
                    v-if="editable"
                    size="sm"
                    variant="ghost"
                    width="auto"
                    class="danger-action"
                    @click="isDeleteTakeoffOpen = true"
                  >
                    Eliminar hoja
                  </UiButton>
                </div>
              </div>

              <TakeoffLinesTable
                :table="takeoffLineTable"
                :editable="editable"
                error-title="No pudimos cargar las líneas"
                empty-title="Sin líneas de medición"
                empty-description="Agrega líneas con dimensiones (largo × ancho × alto) o una cantidad explícita."
                @retry="loadTakeoff"
                @edit="openTakeoffLine"
                @delete="removeTakeoffLine"
              />
            </UiCard>

            <UiCard v-else-if="!isLoadingTakeoff">
              <UiEmptyState
                title="Selecciona una hoja de takeoff"
                description="Las hojas agrupan mediciones y aplican la cantidad total a una actividad."
              >
                <template #icon><IconRulerMeasure :size="48" stroke-width="1.5" /></template>
              </UiEmptyState>
            </UiCard>
          </div>
        </div>
      </template>

      <!-- Reporte imprimible / PDF -->
      <section v-if="budget" class="print-report" aria-hidden="true">
        <header class="print-header">
          <h1>{{ project?.name || 'Proyecto' }}</h1>
          <p>
            {{ project?.code || '' }} · Presupuesto v{{ budget.version }}
            <template v-if="budget.label"> · {{ budget.label }}</template>
            · {{ budgetStatusLabel(budget.status) }}
          </p>
        </header>

        <h2>Presupuesto</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Actividad</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Valor unitario</th>
              <th>Valor parcial</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in budget.items" :key="item.id">
              <td>{{ item.code }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.unit_code || '' }}</td>
              <td class="num">{{ item.item_type === 'activity' ? formatNumber(item.quantity, 4) : '' }}</td>
              <td class="num">{{ formatMoney(item.unit_price, budget.currency_code) }}</td>
              <td class="num">{{ formatMoney(item.partial_amount, budget.currency_code) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-totals">
          <span>Directo: {{ formatMoney(budget.subtotal, budget.currency_code) }}</span>
          <span>Indirecto: {{ formatMoney(budget.indirect_total, budget.currency_code) }}</span>
          <strong>Total: {{ formatMoney(budget.total, budget.currency_code) }}</strong>
        </div>

        <h2>Listado total de insumos</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Insumo</th>
              <th>Tipo</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Costo unitario</th>
              <th>Costo total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in materials" :key="`print-${row.resource_code}-${row.unit_code}-${row.component_type}`">
              <td>{{ row.resource_code }}</td>
              <td>{{ row.resource_name }}</td>
              <td>{{ componentTypeLabel(row.component_type) }}</td>
              <td>{{ row.unit_code }}</td>
              <td class="num">{{ formatNumber(row.quantity, 4) }}</td>
              <td class="num">{{ formatMoney(row.unit_cost, row.currency_code) }}</td>
              <td class="num">{{ formatMoney(row.total_cost, row.currency_code) }}</td>
            </tr>
            <tr v-if="materials.length === 0">
              <td colspan="7">Sin insumos registrados.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <UiFormModal
      v-model="isChapterOpen"
      title="Nuevo capítulo"
      description="Los capítulos agrupan y ordenan las actividades del presupuesto."
      submit-label="Crear capítulo"
      :loading="isSavingItem"
      footer-hint="Puedes mover actividades entre capítulos editando cada actividad."
      :dirty="isChapterDirty"
      :confirm-on-dirty="true"
      @submit="saveChapter"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Datos del capítulo" description="El código es opcional y se usa para ordenar el WBS.">
        <div class="form-grid">
          <UiInput v-model="chapterForm.name" label="Nombre" required />
          <UiInput
            v-model="chapterForm.code"
            label="Código (opcional)"
            placeholder="01"
            hint="Ej. 01, 02. Se muestra antes del nombre en la tabla."
          />
        </div>
      </UiFormSection>
    </UiFormModal>

    <UiFormModal
      v-model="isActivityOpen"
      title="Nueva actividad manual"
      description="Crea una actividad con precio propio cuando no proviene de un APU."
      submit-label="Crear actividad"
      :loading="isSavingItem"
      size="large"
      footer-hint="Las actividades manuales no consolidan insumos; para eso usa una actividad desde APU."
      :dirty="isActivityDirty"
      :confirm-on-dirty="true"
      @submit="saveActivity"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <UiFormSection title="Ubicación" description="Capítulo y código con el que se ordena la actividad.">
        <div class="form-grid">
          <UiSelect v-model="activityForm.parentId" label="Capítulo" :options="chapterOptions" />
          <UiInput v-model="activityForm.code" label="Código (opcional)" placeholder="PRE-002" />
          <UiInput v-model="activityForm.name" label="Actividad" required class="span-2" />
        </div>
      </UiFormSection>
      <UiFormSection title="Medición y costo" description="Unidad, cantidad y valor unitario de la actividad.">
        <div class="form-grid">
          <UiSelect v-model="activityForm.unitId" label="Unidad" :options="unitOptions" :clearable="false" />
          <UiInput
            v-model="activityForm.quantity"
            label="Cantidad"
            type="number"
            hint="Cantidad 0 no suma al presupuesto ni a los insumos."
          />
          <UiInput v-model="activityForm.unitPrice" label="Valor unitario" type="number" />
          <UiSelect v-model="activityForm.assignedMembershipId" label="Responsable" :options="memberOptions" />
        </div>
      </UiFormSection>
    </UiFormModal>

    <UiFormModal
      v-model="isEditOpen"
      title="Editar actividad"
      description="Ajusta la cantidad, el responsable o las notas de la actividad."
      submit-label="Guardar"
      :loading="isSavingItem"
      size="large"
      :footer-hint="
        editForm?.apu_id
          ? 'El valor unitario proviene del APU y no se edita aquí; para cambiarlo actualiza el APU.'
          : 'El valor parcial se recalcula al guardar.'
      "
      :dirty="isEditDirty"
      :confirm-on-dirty="true"
      @submit="saveEdit"
    >
      <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
      <template v-if="editForm">
        <UiFormSection title="Actividad" description="Nombre visible y notas internas.">
          <div class="form-grid">
            <UiInput v-model="editForm.name" label="Actividad" required class="span-2" />
            <UiInput v-model="editForm.notes" label="Notas" class="span-2" />
          </div>
        </UiFormSection>
        <UiFormSection title="Medición y costo" description="Cantidad, precio y responsable del seguimiento.">
          <div class="form-grid">
            <UiInput
              v-model="editForm.quantity"
              label="Cantidad"
              type="number"
              hint="Cantidad 0 no suma al presupuesto ni a los insumos."
            />
            <UiInput
              v-model="editForm.unit_price"
              label="Valor unitario"
              type="number"
              :disabled="Boolean(editForm.apu_id)"
              :hint="editForm.apu_id ? 'Definido por el APU.' : ''"
            />
            <UiSelect v-model="editForm.assigned_membership_id" label="Responsable" :options="memberOptions" />
          </div>
        </UiFormSection>
      </template>
    </UiFormModal>

    <UiFormModal
      v-model="isApusOpen"
      title="Añadir actividades desde APUs"
      description="Selecciona APUs de una base y el capítulo donde se crearán las actividades."
      size="large"
      :hide-footer="true"
    >
      <div class="apus-picker">
        <UiFormSection title="Filtros" description="Elige la base y busca por código o nombre.">
          <div class="apus-picker-toolbar">
            <UiSelect v-model="apuBaseId" label="Base de APUs" :options="apuBaseOptions" :clearable="false" />
            <UiSelect v-model="apuParentId" label="Capítulo destino" :options="chapterOptions" />
            <UiSearchInput v-model="apuSearch" placeholder="Buscar APU..." aria-label="Buscar APU" />
          </div>
        </UiFormSection>

        <div class="apus-picker-list-head">
          <span>{{ selectedApus.length }} seleccionados de {{ filteredApus.length }}</span>
          <UiButton
            v-if="filteredApus.length > 0"
            size="sm"
            variant="ghost"
            width="auto"
            @click="toggleSelectAllApus"
          >
            {{ selectedApus.length === filteredApus.length ? 'Quitar selección' : 'Seleccionar todos' }}
          </UiButton>
        </div>

        <div v-if="isLoadingApus" class="budget-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
        </div>
        <ul v-else-if="filteredApus.length > 0" class="apus-list">
          <li v-for="apu in filteredApus" :key="apu.id">
            <label class="apu-check">
              <input v-model="selectedApus" type="checkbox" :value="apu.id" />
              <span class="apu-check-copy">
                <strong>{{ apu.code }} · {{ apu.name }}</strong>
                <span>{{ apu.base_name }} · {{ apu.unit_code }} · {{ formatMoney(apu.unit_cost, budget?.currency_code) }}</span>
              </span>
            </label>
          </li>
        </ul>
        <UiEmptyState
          v-else
          :title="apus.length === 0 ? 'La base no tiene APUs' : 'Sin APUs que coincidan'"
          :description="
            apus.length === 0
              ? 'Crea APUs en Estimación o elige otra base.'
              : 'Prueba con otro código o nombre.'
          "
        />

        <div class="apus-picker-actions">
          <p class="section-hint">
            Las actividades se crean con cantidad 0; escribe la cantidad en la tabla.
            <template v-if="selectedApus.length > 0">
              Total estimado por unidad: {{ formatMoney(selectedApusTotal, budget?.currency_code) }}.
            </template>
          </p>
          <div class="apus-picker-buttons">
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

    <!-- Importar presupuesto -->
    <UiFormModal
      v-model="isImportOpen"
      title="Importar presupuesto"
      description="Cada fila es una actividad. Las filas con el mismo capítulo se agrupan."
      submit-label="Importar"
      size="large"
      :loading="isImporting"
      footer-hint="Máximo 500 filas y 10 MB. Las actividades se actualizan por código dentro de cada capítulo."
      @submit="importBudget"
    >
      <UiAlert v-if="importError" type="error">{{ importError }}</UiAlert>
      <UiAlert v-if="importResult" type="success">
        Presupuesto v{{ importResult.budget.version }}: {{ importResult.created }} filas creadas y
        {{ importResult.updated }} actualizadas.
      </UiAlert>
      <UiFileDropzone
        v-model="importFile"
        accept=".csv,.xlsx"
        hint="Columnas: capitulo_codigo, capitulo, codigo, actividad, unidad, cantidad, valor_unitario. Máximo 500 filas."
      />
    </UiFormModal>

    <!-- Nueva versión -->
    <UiFormModal
      v-model="isVersionOpen"
      title="Nueva versión del presupuesto"
      :description="budget ? `Se copiarán las actividades de la versión v${budget.version}.` : ''"
      submit-label="Crear versión"
      :loading="isCreatingVersion"
      footer-hint="La versión actual queda aprobada hasta que apruebes la nueva."
      @submit="createVersion"
    >
      <UiAlert v-if="versionFormError" type="error">{{ versionFormError }}</UiAlert>
      <UiInput
        v-model="versionLabel"
        label="Etiqueta (opcional)"
        placeholder="Rev A, Entregado al cliente…"
      />
    </UiFormModal>

    <!-- Nueva hoja de takeoff -->
    <UiFormModal
      v-model="isTakeoffSheetOpen"
      title="Nueva hoja de takeoff"
      description="Una hoja agrupa mediciones y aplica su cantidad total a una actividad."
      submit-label="Crear hoja"
      :loading="isSavingTakeoff"
      footer-hint="Solo se suman las líneas con la misma unidad que la actividad destino."
      :dirty="isTakeoffSheetDirty"
      :confirm-on-dirty="true"
      @submit="createTakeoffSheet"
    >
      <UiAlert v-if="takeoffError" type="error">{{ takeoffError }}</UiAlert>
      <UiFormSection title="Datos de la hoja" description="Nombre, descripción y actividad destino.">
        <div class="form-grid">
          <UiInput v-model="takeoffSheetForm.name" label="Nombre" required class="span-2" />
          <UiInput v-model="takeoffSheetForm.description" label="Descripción" class="span-2" />
          <UiSelect
            v-model="takeoffSheetForm.budgetItemId"
            label="Actividad del presupuesto"
            :options="activityOptions"
            class="span-2"
            hint="Solo se listan actividades del presupuesto actual."
          />
        </div>
      </UiFormSection>
    </UiFormModal>

    <!-- Línea de takeoff -->
    <UiFormModal
      v-model="isTakeoffLineOpen"
      :title="takeoffLineForm.id ? 'Editar línea' : 'Nueva línea de takeoff'"
      description="Mide por dimensiones o escribe una cantidad explícita."
      submit-label="Guardar línea"
      size="large"
      :loading="isSavingTakeoffLine"
      footer-hint="Solo se suman al presupuesto las líneas con la unidad de la actividad."
      :dirty="isTakeoffLineDirty"
      :confirm-on-dirty="true"
      @submit="saveTakeoffLine"
    >
      <UiAlert v-if="takeoffError" type="error">{{ takeoffError }}</UiAlert>
      <UiFormSection title="Descripción" description="Identifica la medición dentro de la hoja.">
        <div class="form-grid">
          <UiInput v-model="takeoffLineForm.description" label="Descripción" required class="span-2" />
          <UiSelect
            v-model="takeoffLineForm.unitId"
            label="Unidad"
            :options="unitOptions"
            :clearable="false"
            hint="Debe coincidir con la unidad de la actividad para aplicar el takeoff."
          />
          <UiInput v-model="takeoffLineForm.notes" label="Notas" />
        </div>
      </UiFormSection>
      <UiFormSection
        title="Medidas"
        description="La cantidad se calcula como piezas × largo × ancho × alto, usando solo valores mayores a cero."
      >
        <div class="form-grid">
          <UiInput v-model="takeoffLineForm.parts" label="Piezas" type="number" hint="Por defecto 1." />
          <UiInput v-model="takeoffLineForm.length" label="Largo" type="number" />
          <UiInput v-model="takeoffLineForm.width" label="Ancho" type="number" />
          <UiInput v-model="takeoffLineForm.height" label="Alto" type="number" />
        </div>
      </UiFormSection>
      <UiFormSection title="Cantidad" description="La cantidad explícita tiene prioridad sobre las dimensiones.">
        <div class="form-grid">
          <UiInput
            v-model="takeoffLineForm.quantity"
            label="Cantidad explícita (opcional)"
            type="number"
            class="span-2"
            hint="Déjala vacía o en 0 para usar las medidas."
          />
        </div>
        <p class="takeoff-preview">
          Cantidad resultante: <strong>{{ formatNumber(takeoffLinePreview, 6) }}</strong>
          {{ takeoffLineUnitLabel }}
        </p>
      </UiFormSection>
    </UiFormModal>

    <UiConfirmDialog
      v-model="isApplyTakeoffOpen"
      title="Aplicar takeoff al presupuesto"
      confirm-label="Aplicar cantidad"
      :loading="isApplyingTakeoff"
      @confirm="applyTakeoff"
    >
      La cantidad total de la hoja ({{ takeoffDetail ? formatNumber(takeoffDetail.total_quantity, 4) : 0 }})
      reemplazará la cantidad de la actividad
      <strong>{{ takeoffDetail?.budget_item_name }}</strong>. Solo se suman las líneas con la misma
      unidad de la actividad.
    </UiConfirmDialog>

    <UiConfirmDialog
      v-model="isDeleteTakeoffOpen"
      title="Eliminar hoja de takeoff"
      variant="danger"
      confirm-label="Eliminar"
      :loading="isDeletingTakeoff"
      @confirm="removeTakeoffSheet"
    >
      ¿Eliminar <strong>{{ takeoffDetail?.name }}</strong> y todas sus líneas? Esta acción no se
      puede deshacer.
    </UiConfirmDialog>

    <ApuDetailModal v-model="isApuDetailOpen" :apu-id="selectedApuId" />
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiTableColumnMenu from '@/components/ui/UiTableColumnMenu.vue';
import UiTabs from '@/components/ui/UiTabs.vue';
import BudgetItemsTable from '@/components/budgets/BudgetItemsTable.vue';
import MaterialsTable from '@/components/budgets/MaterialsTable.vue';
import VersionsTable from '@/components/budgets/VersionsTable.vue';
import CompareTable from '@/components/budgets/CompareTable.vue';
import TakeoffLinesTable from '@/components/budgets/TakeoffLinesTable.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import UiExportMenu from '@/components/ui/UiExportMenu.vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';
import ApuDetailModal from '@/components/estimating/ApuDetailModal.vue';
import {
  IconArrowLeft,
  IconCalculator,
  IconFileImport,
  IconGitCompare,
  IconHistory,
  IconLock,
  IconPlus,
  IconPrinter,
  IconRulerMeasure,
  IconStack2,
  IconTable,
  IconVersions,
} from '@tabler/icons-vue';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { budgetService } from '@/services/budget.service';
import { projectService } from '@/services/project.service';
import { estimatingService } from '@/services/estimating.service';
import { catalogService } from '@/services/catalog.service';
import { memberService } from '@/services/member.service';
import { useToast } from '@/composables/useToast';
import { useDirtyForm } from '@/composables/useDirtyForm';
import { useAppTable } from '@/composables/useAppTable';
import {
  useBudgetItemColumns,
  useCompareColumns,
  useMaterialColumns,
  useTakeoffLineColumns,
  useVersionColumns,
} from '@/composables/useBudgetColumns';
import { apiErrorMessage } from '@/utils/error';
import type { ExportedFile, ExportFormat } from '@/api/export';
import type { Project } from '@/types/project';
import type {
  BudgetDetail,
  BudgetImportSummary,
  BudgetItem,
  BudgetStatus,
  BudgetTreeRow,
  BudgetVersionSummary,
  CompareDiffRow,
  CompareResult,
  MaterialRow,
  TakeoffLine,
  TakeoffSheet,
  TakeoffSheetDetail,
} from '@/types/budget';
import type { Apu, ApuBase } from '@/types/estimating';
import type { Unit } from '@/types/catalog';
import type { Member } from '@/types/member';
import type { UiTabItem } from '@/types/ui';

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

type BudgetTab = 'budget' | 'materials' | 'versions' | 'takeoff';

const activeTab = ref<BudgetTab>('budget');
const budgetTabs: Array<{ id: BudgetTab; label: string; icon: Component }> = [
  { id: 'budget', label: 'Presupuesto', icon: IconTable },
  { id: 'materials', label: 'Insumos', icon: IconStack2 },
  { id: 'versions', label: 'Versiones y comparador', icon: IconHistory },
  { id: 'takeoff', label: 'Takeoff', icon: IconRulerMeasure },
];
const budgetTabItems = computed<UiTabItem[]>(() =>
  budgetTabs.map((tab) => ({ value: tab.id, label: tab.label, icon: tab.icon })),
);
const activeTabModel = computed({
  get: () => activeTab.value as string,
  set: (value: string) => {
    void selectTab(value as BudgetTab);
  },
});

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

function applyBudget(detail: BudgetDetail | null): void {
  budget.value = detail;
  if (!detail) return;
  indirects.pct = String(detail.indirect_pct);
  indirects.fixed = String(detail.indirect_fixed);
  versionLabelDraft.value = detail.label ?? '';
  expanded.value = new Set(
    detail.items.filter((item) => item.item_type === 'chapter').map((item) => item.id),
  );
  materialsBudgetId.value = null;
}

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    project.value = await projectService.get(projectId.value);
    applyBudget(await budgetService.getByProject(projectId.value));
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
const { isDirty: isChapterDirty, capture: captureChapterForm } = useDirtyForm(() => ({
  ...chapterForm,
}));
const activityForm = reactive({
  parentId: '',
  code: '',
  name: '',
  unitId: '',
  quantity: '0',
  unitPrice: '0',
  assignedMembershipId: '',
});
const { isDirty: isActivityDirty, capture: captureActivityForm } = useDirtyForm(() => ({
  ...activityForm,
}));
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
const { isDirty: isEditDirty, capture: captureEditForm } = useDirtyForm(() => ({
  ...(editForm.value ?? {}),
}));

function openChapter(): void {
  chapterForm.name = '';
  chapterForm.code = '';
  captureChapterForm();
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
  captureActivityForm();
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
  captureEditForm();
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
const selectedApusTotal = computed(() =>
  filteredApus.value
    .filter((apu) => selectedApus.value.includes(apu.id))
    .reduce((sum, apu) => sum + apu.unit_cost, 0),
);

function toggleSelectAllApus(): void {
  const visible = filteredApus.value.map((apu) => apu.id);
  if (visible.every((id) => selectedApus.value.includes(id))) {
    selectedApus.value = selectedApus.value.filter((id) => !visible.includes(id));
  } else {
    selectedApus.value = Array.from(new Set([...selectedApus.value, ...visible]));
  }
}

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

// --- Etiquetas ---
function budgetStatusLabel(status: BudgetStatus): string {
  return {
    draft: 'Borrador',
    in_review: 'En revisión',
    approved: 'Aprobado',
    superseded: 'Reemplazado',
  }[status];
}

function componentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    material: 'Material',
    labor: 'Mano de obra',
    equipment: 'Equipo',
    transport: 'Transporte',
    subcontract: 'Subcontrato',
    mano_de_obra: 'Mano de obra',
  };
  return labels[type] ?? type;
}

const activityOptions = computed(() =>
  (budget.value?.items ?? [])
    .filter((item) => item.item_type === 'activity')
    .map((item) => ({ label: `${item.code} · ${item.name}`, value: item.id })),
);

async function selectTab(tab: BudgetTab): Promise<void> {
  activeTab.value = tab;
  if (!budget.value) return;
  if (tab === 'materials') await loadMaterials();
  if (tab === 'versions') await loadVersions();
  if (tab === 'takeoff') await loadTakeoff();
}

// --- Insumos ---
const materials = ref<MaterialRow[]>([]);
const materialsBudgetId = ref<string | null>(null);
const isLoadingMaterials = ref(false);

async function loadMaterials(force = false): Promise<void> {
  if (!budget.value) return;
  if (!force && materialsBudgetId.value === budget.value.id) return;
  isLoadingMaterials.value = true;
  try {
    const budgetId = budget.value.id;
    materials.value = await budgetService.getMaterials(budgetId);
    materialsBudgetId.value = budgetId;
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar los insumos'));
  } finally {
    isLoadingMaterials.value = false;
  }
}

function exportMaterialsFile(format: ExportFormat): Promise<ExportedFile> {
  if (!budget.value) return Promise.reject(new Error('Sin presupuesto'));
  return budgetService.exportMaterials(budget.value.id, format);
}

function exportBudgetFile(format: ExportFormat): Promise<ExportedFile> {
  if (!budget.value) return Promise.reject(new Error('Sin presupuesto'));
  return budgetService.exportBudget(budget.value.id, format);
}

// --- Versiones ---
const versions = ref<BudgetVersionSummary[]>([]);
const isLoadingVersions = ref(false);
const isVersionOpen = ref(false);
const versionLabel = ref('');
const versionFormError = ref<string | null>(null);
const isCreatingVersion = ref(false);
const versionLabelDraft = ref('');
const isSavingLabel = ref(false);
const compareBaseId = ref('');
const compareTargetId = ref('');
const compareResult = ref<CompareResult | null>(null);
const isComparing = ref(false);

const versionOptions = computed(() =>
  versions.value.map((version) => ({
    label: `v${version.version}${version.label ? ` · ${version.label}` : ''} · ${budgetStatusLabel(version.status)}`,
    value: version.id,
  })),
);

async function loadVersions(): Promise<void> {
  isLoadingVersions.value = true;
  try {
    versions.value = await budgetService.listVersions(projectId.value);
    const ids = new Set(versions.value.map((version) => version.id));
    if (!ids.has(compareBaseId.value)) {
      compareBaseId.value = versions.value[1]?.id ?? versions.value[0]?.id ?? '';
    }
    if (!ids.has(compareTargetId.value)) {
      compareTargetId.value = versions.value[0]?.id ?? '';
    }
    if (budget.value) versionLabelDraft.value = budget.value.label ?? '';
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar las versiones'));
  } finally {
    isLoadingVersions.value = false;
  }
}

function openVersionModal(): void {
  versionLabel.value = '';
  versionFormError.value = null;
  isVersionOpen.value = true;
}

async function createVersion(): Promise<void> {
  if (!budget.value) return;
  isCreatingVersion.value = true;
  versionFormError.value = null;
  try {
    const created = await budgetService.createVersion(
      budget.value.id,
      versionLabel.value.trim() || null,
    );
    isVersionOpen.value = false;
    applyBudget(created);
    activeTab.value = 'budget';
    toast.success(`Versión v${created.version} creada`);
    await loadVersions();
  } catch (err) {
    versionFormError.value = apiErrorMessage(err, 'No pudimos crear la versión');
  } finally {
    isCreatingVersion.value = false;
  }
}

async function openVersion(id: string): Promise<void> {
  if (budget.value?.id === id) return;
  try {
    applyBudget(await budgetService.getById(id));
    toast.info(`Mostrando la versión v${budget.value?.version}`);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos abrir la versión'));
  }
}

async function saveVersionLabel(): Promise<void> {
  if (!budget.value) return;
  isSavingLabel.value = true;
  try {
    applyBudget(
      await budgetService.update(budget.value.id, {
        label: versionLabelDraft.value.trim() || null,
      }),
    );
    toast.success('Etiqueta actualizada');
    await loadVersions();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos actualizar la etiqueta'));
  } finally {
    isSavingLabel.value = false;
  }
}

async function runCompare(): Promise<void> {
  if (!compareBaseId.value || !compareTargetId.value) return;
  if (compareBaseId.value === compareTargetId.value) {
    toast.error('Selecciona dos versiones distintas');
    return;
  }
  isComparing.value = true;
  try {
    compareResult.value = await budgetService.compare(compareBaseId.value, compareTargetId.value);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos comparar las versiones'));
  } finally {
    isComparing.value = false;
  }
}

// --- Takeoff ---
const takeoffSheets = ref<TakeoffSheet[]>([]);
const takeoffDetail = ref<TakeoffSheetDetail | null>(null);

const budgetTable = useAppTable<BudgetTreeRow>({
  columns: useBudgetItemColumns(),
  data: computed(() => visibleRows.value),
});
const materialTable = useAppTable<MaterialRow>({
  columns: useMaterialColumns(),
  data: computed(() => materials.value),
  getRowId: (row) => row.resource_code,
});
const versionTable = useAppTable<BudgetVersionSummary>({
  columns: useVersionColumns(),
  data: computed(() => versions.value),
});
const compareTable = useAppTable<CompareDiffRow>({
  columns: useCompareColumns(),
  data: computed(() => compareResult.value?.rows ?? []),
  getRowId: (row) => `${row.item_type}-${row.code}-${row.name}`,
});
const takeoffLineTable = useAppTable<TakeoffLine>({
  columns: useTakeoffLineColumns(),
  data: computed(() => takeoffDetail.value?.lines ?? []),
});
const isLoadingTakeoff = ref(false);
const isSavingTakeoff = ref(false);
const isSavingTakeoffLine = ref(false);
const isApplyingTakeoff = ref(false);
const isDeletingTakeoff = ref(false);
const isTakeoffSheetOpen = ref(false);
const isTakeoffLineOpen = ref(false);
const isApplyTakeoffOpen = ref(false);
const isDeleteTakeoffOpen = ref(false);
const takeoffError = ref<string | null>(null);
const takeoffSheetForm = reactive({ name: '', description: '', budgetItemId: '' });
const { isDirty: isTakeoffSheetDirty, capture: captureTakeoffSheetForm } = useDirtyForm(() => ({
  ...takeoffSheetForm,
}));
const takeoffLineForm = reactive({
  id: '',
  description: '',
  unitId: '',
  parts: '1',
  length: '0',
  width: '0',
  height: '0',
  quantity: '',
  notes: '',
});
const takeoffLinePreview = computed(() =>
  calculateTakeoffQuantity(
    Number(takeoffLineForm.parts) || 0,
    Number(takeoffLineForm.length) || 0,
    Number(takeoffLineForm.width) || 0,
    Number(takeoffLineForm.height) || 0,
    takeoffLineForm.quantity === '' ? undefined : Number(takeoffLineForm.quantity),
  ),
);
const takeoffLineUnitLabel = computed(
  () => units.value.find((unit) => unit.id === takeoffLineForm.unitId)?.code ?? '',
);
const { isDirty: isTakeoffLineDirty, capture: captureTakeoffLineForm } = useDirtyForm(() => ({
  ...takeoffLineForm,
}));

async function loadTakeoff(): Promise<void> {
  isLoadingTakeoff.value = true;
  try {
    takeoffSheets.value = await budgetService.listTakeoffSheets(projectId.value);
    if (takeoffDetail.value && !takeoffSheets.value.some((sheet) => sheet.id === takeoffDetail.value?.id)) {
      takeoffDetail.value = null;
    }
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar el takeoff'));
  } finally {
    isLoadingTakeoff.value = false;
  }
}

async function openTakeoffSheetDetail(id: string): Promise<void> {
  try {
    takeoffDetail.value = await budgetService.getTakeoffSheet(id);
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos cargar la hoja'));
  }
}

function openTakeoffSheet(): void {
  takeoffSheetForm.name = '';
  takeoffSheetForm.description = '';
  takeoffSheetForm.budgetItemId = '';
  captureTakeoffSheetForm();
  takeoffError.value = null;
  isTakeoffSheetOpen.value = true;
}

async function createTakeoffSheet(): Promise<void> {
  if (!takeoffSheetForm.name.trim()) {
    takeoffError.value = 'El nombre de la hoja es obligatorio.';
    return;
  }
  isSavingTakeoff.value = true;
  takeoffError.value = null;
  try {
    const sheet = await budgetService.createTakeoffSheet(projectId.value, {
      name: takeoffSheetForm.name.trim(),
      description: takeoffSheetForm.description.trim() || null,
      budgetItemId: takeoffSheetForm.budgetItemId || null,
    });
    isTakeoffSheetOpen.value = false;
    takeoffDetail.value = sheet;
    await loadTakeoff();
    toast.success('Hoja de takeoff creada');
  } catch (err) {
    takeoffError.value = apiErrorMessage(err, 'No pudimos crear la hoja');
  } finally {
    isSavingTakeoff.value = false;
  }
}

function calculateTakeoffQuantity(
  parts: number,
  length: number,
  width: number,
  height: number,
  explicit?: number,
): number {
  if (explicit !== undefined && explicit > 0) {
    return Math.round(explicit * 1_000_000) / 1_000_000;
  }
  let quantity = parts > 0 ? parts : 1;
  if (length > 0) quantity *= length;
  if (width > 0) quantity *= width;
  if (height > 0) quantity *= height;
  return Math.round(quantity * 1_000_000) / 1_000_000;
}

function computedLineQuantity(line: TakeoffLine): number {
  return calculateTakeoffQuantity(line.parts, line.length, line.width, line.height);
}

function openTakeoffLine(line?: TakeoffLine): void {
  takeoffError.value = null;
  if (line) {
    const isExplicit = Math.abs(line.quantity - computedLineQuantity(line)) > 0.000001;
    Object.assign(takeoffLineForm, {
      id: line.id,
      description: line.description,
      unitId: line.unit_id,
      parts: String(line.parts),
      length: String(line.length),
      width: String(line.width),
      height: String(line.height),
      quantity: isExplicit ? String(line.quantity) : '',
      notes: line.notes ?? '',
    });
  } else {
    Object.assign(takeoffLineForm, {
      id: '',
      description: '',
      unitId: takeoffDetail.value?.lines[0]?.unit_id ?? units.value[0]?.id ?? '',
      parts: '1',
      length: '0',
      width: '0',
      height: '0',
      quantity: '',
      notes: '',
    });
  }
  captureTakeoffLineForm();
  isTakeoffLineOpen.value = true;
}

async function saveTakeoffLine(): Promise<void> {
  if (!takeoffDetail.value) return;
  if (!takeoffLineForm.description.trim() || !takeoffLineForm.unitId) {
    takeoffError.value = 'Descripción y unidad son obligatorias.';
    return;
  }
  isSavingTakeoffLine.value = true;
  takeoffError.value = null;
  try {
    const payload = {
      description: takeoffLineForm.description.trim(),
      unitId: takeoffLineForm.unitId,
      parts: Number(takeoffLineForm.parts) || 1,
      length: Number(takeoffLineForm.length) || 0,
      width: Number(takeoffLineForm.width) || 0,
      height: Number(takeoffLineForm.height) || 0,
      quantity: takeoffLineForm.quantity === '' ? undefined : Number(takeoffLineForm.quantity),
      notes: takeoffLineForm.notes.trim() || null,
    };
    takeoffDetail.value = takeoffLineForm.id
      ? await budgetService.updateTakeoffLine(takeoffLineForm.id, payload)
      : await budgetService.addTakeoffLine(takeoffDetail.value.id, payload);
    isTakeoffLineOpen.value = false;
    await loadTakeoff();
    toast.success('Línea guardada');
  } catch (err) {
    takeoffError.value = apiErrorMessage(err, 'No pudimos guardar la línea');
  } finally {
    isSavingTakeoffLine.value = false;
  }
}

async function removeTakeoffLine(line: TakeoffLine): Promise<void> {
  try {
    takeoffDetail.value = await budgetService.deleteTakeoffLine(line.id);
    await loadTakeoff();
    toast.success('Línea eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la línea'));
  }
}

async function applyTakeoff(): Promise<void> {
  if (!takeoffDetail.value) return;
  isApplyingTakeoff.value = true;
  try {
    takeoffDetail.value = await budgetService.applyTakeoff(takeoffDetail.value.id);
    isApplyTakeoffOpen.value = false;
    toast.success('Cantidad aplicada al presupuesto');
    await load();
    await loadTakeoff();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos aplicar el takeoff'));
  } finally {
    isApplyingTakeoff.value = false;
  }
}

async function removeTakeoffSheet(): Promise<void> {
  if (!takeoffDetail.value) return;
  isDeletingTakeoff.value = true;
  try {
    await budgetService.deleteTakeoffSheet(takeoffDetail.value.id);
    isDeleteTakeoffOpen.value = false;
    takeoffDetail.value = null;
    await loadTakeoff();
    toast.success('Hoja eliminada');
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la hoja'));
  } finally {
    isDeletingTakeoff.value = false;
  }
}

// --- Importar presupuesto ---
const isImportOpen = ref(false);
const importFile = ref<File | null>(null);
const isImporting = ref(false);
const importError = ref<string | null>(null);
const importResult = ref<BudgetImportSummary | null>(null);

function openImport(): void {
  importFile.value = null;
  importError.value = null;
  importResult.value = null;
  isImportOpen.value = true;
}

async function importBudget(): Promise<void> {
  importError.value = null;
  importResult.value = null;
  if (!importFile.value) {
    importError.value = 'Adjunta un archivo .csv o .xlsx.';
    return;
  }
  isImporting.value = true;
  try {
    const result = await budgetService.importBudget(projectId.value, importFile.value);
    importResult.value = result;
    importFile.value = null;
    applyBudget(result.budget);
    toast.success(
      `Importación procesada: ${result.created} filas creadas y ${result.updated} actualizadas`,
    );
    await loadVersions();
  } catch (err) {
    importError.value = apiErrorMessage(err, 'No pudimos importar el presupuesto');
  } finally {
    isImporting.value = false;
  }
}

// --- Reporte ---
async function printReport(): Promise<void> {
  if (!budget.value) return;
  if (materialsBudgetId.value !== budget.value.id) await loadMaterials(true);
  await nextTick();
  window.print();
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

.apus-picker-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.apus-picker-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.apus-picker-buttons {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

.takeoff-preview {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-app);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.takeoff-preview strong {
  color: var(--text-main);
}

/* --- Tabs y secciones --- */
.budget-tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.budget-tab {
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

.budget-tab:hover {
  color: var(--text-main);
  background: var(--bg-hover);
}

.budget-tab.is-active {
  color: var(--text-main);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.section-title {
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-main);
}

.section-subtitle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-main);
}

.section-hint {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.section-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

/* --- Insumos --- */
.materials-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.materials-head,
.materials-row {
  display: grid;
  grid-template-columns: 90px minmax(200px, 1fr) 110px 70px 110px 130px 130px 60px;
  gap: var(--space-2);
  align-items: center;
  min-width: 960px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.materials-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.materials-row {
  border-top: 1px solid var(--border);
  color: var(--text-main);
}

/* --- Versiones --- */
.versions-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  margin-bottom: var(--space-3);
}

.versions-head,
.versions-row {
  display: grid;
  grid-template-columns: 80px minmax(150px, 1fr) 130px 130px 130px 70px 90px;
  gap: var(--space-2);
  align-items: center;
  min-width: 880px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.versions-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.versions-row {
  border-top: 1px solid var(--border);
}

.versions-row.is-current {
  background: var(--bg-hover);
  font-weight: 600;
}

.versions-actions {
  display: flex;
  justify-content: flex-end;
}

.version-label {
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
  flex-wrap: wrap;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border);
}

.version-label :deep(.ui-field) {
  min-width: 260px;
}

.compare-section {
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
  margin-top: var(--space-2);
}

.compare-controls {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto;
  gap: var(--space-2);
  align-items: end;
  margin-bottom: var(--space-3);
}

.compare-totals {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.delta-up {
  color: var(--color-danger-text);
}

.delta-down {
  color: var(--color-success-text);
}

.compare-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.compare-head,
.compare-row {
  display: grid;
  grid-template-columns: 80px minmax(180px, 1fr) 100px 100px 120px 120px 120px 100px;
  gap: var(--space-2);
  align-items: center;
  min-width: 980px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.compare-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.compare-row {
  border-top: 1px solid var(--border);
}

.compare-row.is-added {
  background: var(--color-success-bg);
}

.compare-row.is-removed {
  background: var(--color-danger-bg);
}

/* --- Takeoff --- */
.takeoff-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.takeoff-sheets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.takeoff-sheet {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-1) var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-main);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.takeoff-sheet:hover {
  background: var(--bg-hover);
}

.takeoff-sheet.is-active {
  border-color: var(--border);
  background: var(--bg-hover);
}

.takeoff-sheet-name {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.takeoff-sheet-meta {
  grid-column: 1;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.takeoff-sheet :deep(.ui-badge) {
  grid-row: 1 / span 2;
  align-self: center;
}

.takeoff-table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.takeoff-head,
.takeoff-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 55px 65px 65px 65px 65px 90px minmax(100px, 1fr) 130px;
  gap: var(--space-2);
  align-items: center;
  min-width: 940px;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.takeoff-head {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border-radius: var(--radius-sm);
}

.takeoff-row {
  border-top: 1px solid var(--border);
}

/* --- Reporte imprimible --- */
.print-report {
  display: none;
}

.print-header h1 {
  margin: 0 0 var(--space-1);
  font-size: 20px;
}

.print-header p {
  margin: 0 0 var(--space-4);
  color: #444;
  font-size: 12px;
}

.print-report h2 {
  margin: var(--space-4) 0 var(--space-2);
  font-size: 14px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.print-table th,
.print-table td {
  border: 1px solid #bbb;
  padding: 4px 6px;
  text-align: left;
}

.print-table th {
  background: #eee;
}

.print-table .num {
  text-align: right;
  white-space: nowrap;
}

.print-totals {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
}

@media print {
  .budget-page > :not(.print-report) {
    display: none !important;
  }

  .print-report {
    display: block !important;
  }

  .print-table {
    page-break-inside: auto;
  }

  .print-table tr {
    page-break-inside: avoid;
  }
}

@media (max-width: 900px) {
  .takeoff-layout {
    grid-template-columns: 1fr;
  }

  .compare-controls {
    grid-template-columns: 1fr;
  }

  .apus-picker-toolbar {
    grid-template-columns: 1fr;
  }

  .apus-picker-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .apus-picker-buttons {
    justify-content: flex-end;
  }

  .budget-footer {
    flex-direction: column;
  }
}
</style>
