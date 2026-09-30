<template>
  <Teleport to="body">
    <div v-if="open" class="palette-overlay" @click="close">
      <div
        ref="dialogRef"
        class="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda rápida"
        @click.stop
        @keydown="onDialogKeydown"
      >
        <div class="palette-input-row">
          <IconSearch :size="16" stroke-width="1.8" class="palette-search-icon" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="palette-input"
            placeholder="Buscar páginas y acciones..."
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            :aria-activedescendant="activeId"
            aria-autocomplete="list"
            aria-label="Buscar páginas y acciones"
            @keydown="onKeydown"
          />
          <kbd class="palette-kbd">ESC</kbd>
        </div>
        <div
          id="palette-listbox"
          class="palette-list"
          role="listbox"
          aria-label="Resultados"
        >
          <button
            v-for="(item, i) in filtered"
            :id="`palette-opt-${item.id}`"
            :key="item.id"
            type="button"
            role="option"
            :aria-selected="i === activeIndex"
            :class="['palette-item', { active: i === activeIndex }]"
            @click="run(item)"
            @mousemove="activeIndex = i"
          >
            <component :is="item.icon" :size="16" stroke-width="1.8" class="palette-item-icon" />
            <span class="palette-item-label">{{ item.label }}</span>
            <span class="palette-item-hint">{{ item.hint }}</span>
          </button>
          <div v-if="filtered.length === 0" class="palette-empty">
            Sin resultados para "{{ query }}"
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  IconSearch,
  IconLayoutDashboard,
  IconUsers,
  IconBuildingCommunity,
  IconShieldLock,
  IconClipboardList,
  IconSettings,
  IconUserCircle,
  IconLogout,
} from '@tabler/icons-vue';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { Permissions } from '@/constants/permissions';

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: any;
  run: () => void;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const { companyPath } = useCompanyPath();

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const query = ref('');
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
let lastFocused: HTMLElement | null = null;

/**
 * El foco real nunca sale del input (patrón combobox), así que la opción
 * resaltada se comunica con aria-activedescendant. Sin esto el lector de
 * pantalla anuncia la lista inicial y no los cambios con las flechas.
 */
const activeId = computed(() => {
  const item = filtered.value[activeIndex.value];
  return item ? `palette-opt-${item.id}` : '';
});

const can = (permission: string): boolean => authStore.hasPermission(permission);

const items = computed<PaletteItem[]>(() => {
  const list: PaletteItem[] = [];
  const go = (label: string, hint: string, icon: any, path: string, permission?: string) => {
    if (permission && !can(permission)) return;
    list.push({
      id: `go-${path}`,
      label,
      hint,
      icon,
      run: () => router.push(companyPath(path)),
    });
  };

  go('Panel', 'Ir al dashboard', IconLayoutDashboard, '/dashboard');
  go('Equipo', 'Gestionar miembros', IconUsers, '/members', Permissions.USERS.READ);
  go('Sedes', 'Gestionar sedes', IconBuildingCommunity, '/branches', Permissions.BRANCHES.READ);
  go('Roles', 'Configurar roles', IconShieldLock, '/roles', Permissions.ROLES.READ);
  go('Auditoría', 'Ver registros', IconClipboardList, '/audit', Permissions.AUDIT.READ);
  go('Empresa', 'Ajustes de la empresa', IconSettings, '/settings', Permissions.SETTINGS.READ);
  go('Mi Cuenta', 'Ver mi perfil', IconUserCircle, '/profile');

  list.push({
    id: 'action-logout',
    label: 'Cerrar sesión',
    hint: 'Acción',
    icon: IconLogout,
    run: async () => {
      await authStore.logout();
      router.push({ name: 'Login' });
    },
  });

  return list;
});

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((item) =>
    `${item.label} ${item.hint}`.toLowerCase().includes(q)
  );
});

const close = () => {
  open.value = false;
};

const run = (item: PaletteItem) => {
  // Se cierra antes de navegar: si la ruta falla, el diálogo ya está fuera.
  close();
  item.run();
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const item = filtered.value[activeIndex.value];
    if (item) run(item);
  }
  // Escape no se trata aquí: lo lleva onDialogKeydown a nivel de diálogo.
  // Si se mantuviera en los dos sitios, el evento propagado cerraría dos veces.
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Escape en cualquier punto y trampa de foco mientras el diálogo está abierto. */
const onDialogKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== 'Tab' || !dialogRef.value) return;

  const focusables = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !dialogRef.value.contains(active))) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
};

// `immediate`: si el componente se monta ya abierto, sin él el input nunca
// recibe el foco y el combobox arranca "ciego".
watch(
  open,
  (value) => {
    if (value) {
      lastFocused = document.activeElement as HTMLElement | null;
      query.value = '';
      activeIndex.value = 0;
      nextTick(() => inputRef.value?.focus());
    } else if (lastFocused) {
      // Devolver el foco evita que se quede en el body tras cerrar.
      lastFocused.focus?.();
      lastFocused = null;
    }
  },
  { immediate: true },
);

watch(filtered, () => {
  activeIndex.value = 0;
});
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 150;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 15vh var(--space-4) var(--space-4);
}

.palette {
  width: 100%;
  max-width: 560px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: palette-in 0.12s ease-out;
}

.palette-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.palette-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.palette-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: var(--text-base);
  outline: none;
  min-width: 0;
}
.palette-input::placeholder {
  color: var(--text-muted);
}

.palette-kbd {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-app);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.palette-list {
  overflow-y: auto;
  padding: var(--space-1);
}

.palette-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-main);
  font-size: var(--text-sm);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.palette-item.active {
  background-color: var(--bg-hover);
}

.palette-item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.palette-item.active .palette-item-icon {
  color: var(--text-main);
}

.palette-item-label {
  flex: 1;
  font-weight: 500;
}

.palette-item-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.palette-empty {
  padding: var(--space-6) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@keyframes palette-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
