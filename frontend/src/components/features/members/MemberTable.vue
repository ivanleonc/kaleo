<template>
  <!--
    MemberTable — Tabla de miembros del equipo.

    Encapsula todas las celdas de dominio (nombre+avatar, roles, estado, acciones)
    manteniendo la flexibilidad de UiDataTable a través de named slots adicionales.
    La view solo gestiona el estado (store, modales) y delega la presentación aquí.

    Slots disponibles:
      - #actions-header: botones adicionales en la cabecera (por defecto: nada)
      - Todos los slots de UiDataTable siguen disponibles vía pass-through
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
    <!-- Celda: nombre + avatar + cargo -->
    <template #cell-name="{ row }">
      <div class="user-cell">
        <UiAvatar :src="row.avatar_url" :name="row.name" size="sm" />
        <div class="user-cell-text">
          <span class="font-medium truncate" :title="row.name">{{ row.name }}</span>
          <span v-if="row.position" class="user-cell-sub truncate" :title="row.position">
            {{ row.position }}
          </span>
        </div>
      </div>
    </template>

    <!-- Celda: email -->
    <template #cell-email="{ row }">
      <span class="truncate" :title="row.email">{{ row.email }}</span>
    </template>

    <!-- Celda: roles con ícono de corona para Owner -->
    <template #cell-roles="{ row }">
      <div class="roles-cell">
        <UiBadge
          v-for="role in row.roles"
          :key="role"
          :variant="isOwnerRole(role) ? 'warning' : 'neutral'"
          size="sm"
        >
          <IconCrown v-if="isOwnerRole(role)" :size="12" stroke-width="2" />
          {{ role }}
        </UiBadge>
      </div>
    </template>

    <!-- Celda: estado activo/inactivo + contraseña temporal -->
    <template #cell-status="{ row }">
      <MemberStatusBadge
        :status="row.status"
        :must-change-password="row.must_change_password"
      />
    </template>

    <!-- Celda: menú de acciones -->
    <template #cell-actions="{ row }">
      <div class="row-actions" v-permission="Permissions.USERS.UPDATE">
        <UiDropdown align="end" label="Acciones del miembro">
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
            <UiDropdownItem @click="emit('reset-password', row)" v-permission="Permissions.USERS.UPDATE">
              <IconKey :size="14" stroke-width="1.8" />
              <span>Resetear contraseña</span>
            </UiDropdownItem>
            <UiDropdownItem @click="emit('manage-companies', row)" v-permission="Permissions.USERS.UPDATE">
              <IconBuildingCommunity :size="14" stroke-width="1.8" />
              <span>Gestionar empresas</span>
            </UiDropdownItem>
            <div class="ui-dropdown-divider" role="separator"></div>
            <UiDropdownItem
              danger
              @click="emit('delete', row)"
              v-permission="Permissions.USERS.DELETE"
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
      <IconUsers :size="48" stroke-width="1.5" />
    </template>

    <!-- Estado vacío: acción primaria -->
    <template #empty-action>
      <slot name="empty-action" />
    </template>
  </UiDataTable>
</template>

<script setup lang="ts">
import type { AppVueTable } from '@tanstack/vue-table';
import UiDataTable from '@/components/ui/UiDataTable.vue';
import UiAvatar from '@/components/ui/UiAvatar.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiDropdown from '@/components/ui/UiDropdown.vue';
import UiDropdownItem from '@/components/ui/UiDropdownItem.vue';
import MemberStatusBadge from './MemberStatusBadge.vue';
import { Permissions } from '@/constants/permissions';
import type { Member } from '@/types/member';
import type { AppFeatures } from '@/composables/useAppTable';
import {
  IconCrown,
  IconDotsVertical,
  IconPencil,
  IconKey,
  IconTrash,
  IconUsers,
  IconBuildingCommunity,
} from '@tabler/icons-vue';

defineProps<{
  table: AppVueTable<AppFeatures, Member, {}, {}, {}>;
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  retry: [];
  edit: [member: Member];
  delete: [member: Member];
  'reset-password': [member: Member];
  'manage-companies': [member: Member];
}>();

const isOwnerRole = (role: string) => role === 'Owner' || role === 'owner';
</script>

<style scoped>
.roles-cell {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
</style>
