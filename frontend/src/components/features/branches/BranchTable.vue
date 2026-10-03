<template>
  <!--
    BranchTable — Tabla de sedes de la empresa.

    Encapsula las celdas de dominio (nombre+código, ubicación, contacto, estado, acciones).
    La view solo gestiona el estado (store, modales).

    Slots:
      - #empty-action: acción en el estado vacío (ej: botón "Nueva Sede")
  -->
  <UiDataTable
    :table="table"
    :loading="loading"
    :error="error"
    :error-title="errorTitle"
    :empty-title="emptyTitle"
    :empty-description="emptyDescription"
    @retry="emit('retry')"
  >
    <!-- Celda: nombre + código + tag "Principal" -->
    <template #cell-name="{ row }">
      <div class="user-cell">
        <div class="branch-avatar">
          <IconBuildingCommunity :size="16" stroke-width="1.8" />
        </div>
        <div class="user-cell-text">
          <span class="font-medium truncate" :title="row.name">
            {{ row.name }}
            <span v-if="row.code" class="text-muted">· {{ row.code }}</span>
          </span>
          <span v-if="row.is_main" class="branch-main-tag">Principal</span>
        </div>
      </div>
    </template>

    <!-- Celda: ubicación (ciudad, estado, país) -->
    <template #cell-location="{ row }">
      <span v-if="row.city || row.state || row.country">
        {{ [row.city, row.state, row.country].filter(Boolean).join(', ') }}
      </span>
      <span v-else class="text-muted">Sin ubicación</span>
    </template>

    <!-- Celda: contacto (teléfono o email) + responsable -->
    <template #cell-contact="{ row }">
      <div class="user-cell-text">
        <span v-if="row.phone || row.email">{{ row.phone || row.email }}</span>
        <span v-else class="text-muted">Sin contacto</span>
        <span v-if="row.manager_name" class="user-cell-sub truncate" :title="row.manager_name">
          Resp: {{ row.manager_name }}
        </span>
      </div>
    </template>

    <!-- Celda: estado activa/inactiva -->
    <template #cell-status="{ row }">
      <UiBadge size="sm" :variant="row.is_active ? 'success' : 'danger'">
        {{ row.is_active ? 'Activa' : 'Inactiva' }}
      </UiBadge>
    </template>

    <!-- Celda: menú de acciones -->
    <template #cell-actions="{ row }">
      <div class="row-actions" v-permission="Permissions.BRANCHES.UPDATE">
        <UiDropdown align="end" label="Acciones de la sede">
          <template #trigger="{ toggle, triggerAria }">
            <button
              class="dots-btn"
              @click.stop="toggle"
              v-bind="triggerAria"
              :aria-label="`Acciones para ${row.name}`"
            >
              <IconDotsVertical :size="16" stroke-width="1.8" />
            </button>
          </template>
          <template #default>
            <UiDropdownItem @click="emit('edit', row)">
              <IconPencil :size="14" stroke-width="1.8" />
              <span>Editar</span>
            </UiDropdownItem>
            <UiDropdownItem @click="emit('toggle-active', row)">
              <IconSwitchHorizontal :size="14" stroke-width="1.8" />
              <span>{{ row.is_active ? 'Desactivar' : 'Activar' }}</span>
            </UiDropdownItem>
            <div class="ui-dropdown-divider" role="separator"></div>
            <UiDropdownItem
              danger
              @click="emit('delete', row)"
              v-permission="Permissions.BRANCHES.DELETE"
            >
              <IconTrash :size="14" stroke-width="1.8" />
              <span>Eliminar</span>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
    </template>

    <!-- Estado vacío: ícono de dominio -->
    <template #empty-icon>
      <IconBuildingCommunity :size="48" stroke-width="1.5" />
    </template>

    <!-- Estado vacío: acción primaria (pass-through) -->
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import { Permissions } from '@/constants/permissions';
import type { Branch } from '@/types/branch';
import type { AppFeatures } from '@/composables/useAppTable';
import {
  IconBuildingCommunity,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconSwitchHorizontal,
} from '@tabler/icons-vue';

defineProps<{
  table: AppVueTable<AppFeatures, Branch, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [branch: Branch];
  delete: [branch: Branch];
  'toggle-active': [branch: Branch];
}>();
</script>

<style scoped>
.branch-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background-color: var(--accent-blue-bg);
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.branch-main-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-amber);
}
</style>
