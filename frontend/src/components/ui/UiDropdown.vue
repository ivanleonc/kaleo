<template>
  <div ref="triggerRef" class="ui-dropdown-trigger">
    <!--
      `toggle` y `triggerAria` se exponen como props del slot porque el
      disparador lo escribe la vista: sin v-bind="triggerAria" el botón no
      anunciaría que abre un menú ni si está expandido.
    -->
    <slot name="trigger" :open="isOpen" :toggle="toggle" :trigger-aria="triggerAria" />
  </div>
  <Teleport to="body">
    <div v-if="isOpen" class="ui-dropdown-overlay" @click="close"></div>
    <div
      v-if="isOpen"
      ref="menuRef"
      class="ui-dropdown-menu"
      :style="menuStyle"
      role="menu"
      :aria-label="label"
      tabindex="-1"
      @keydown="onMenuKeydown"
      @focusout="onMenuFocusout"
    >
      <slot :close="close" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, provide } from 'vue';

interface Props {
  modelValue?: boolean;
  align?: 'start' | 'end';
  minWidth?: number;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  align: 'end',
  minWidth: 180,
  label: 'Acciones',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

const triggerAria = computed<{ 'aria-haspopup': 'menu'; 'aria-expanded': boolean }>(() => ({
  'aria-haspopup': 'menu',
  'aria-expanded': isOpen.value,
}));

const updatePosition = () => {
  const trigger = triggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const menuHeight = menuRef.value?.offsetHeight || 220;
  const width = Math.max(props.minWidth, rect.width);

  let top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = Math.max(8, rect.top - menuHeight - 4);
  }

  let left = props.align === 'end' ? rect.right - width : rect.left;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

  menuStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    minWidth: `${width}px`,
  };
};

const onViewportChange = () => {
  if (isOpen.value) updatePosition();
};

const setOpen = (value: boolean) => {
  isOpen.value = value;
  emit('update:modelValue', value);
  if (value) {
    nextTick(() => {
      updatePosition();
      // El foco entra en el menú al abrirlo: si se queda en el trigger, los
      // lectores de pantalla no anuncian el contenido ni hay navegación con flechas.
      const first = items()[0];
      (first || menuRef.value)?.focus();
      window.addEventListener('scroll', onViewportChange, true);
      window.addEventListener('resize', onViewportChange);
    });
  } else {
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
  }
};

const open = () => setOpen(true);
const close = () => setOpen(false);
const toggle = () => setOpen(!isOpen.value);

const closeAndFocusTrigger = () => {
  close();
  const focusable = triggerRef.value?.querySelector<HTMLElement>('button, [tabindex]');
  focusable?.focus();
};

const items = (): HTMLElement[] => {
  if (!menuRef.value) return [];
  // No se filtra por offsetParent: el menú es position:fixed y ese chequeo
  // además devuelve null de forma fiable en entornos sin layout (jsdom).
  return Array.from(
    menuRef.value.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled]):not([hidden]):not([aria-hidden="true"])',
    ),
  );
};

/** Cierra cuando el foco sale del menú y del disparador (Tab hacia fuera). */
const onMenuFocusout = (event: FocusEvent) => {
  const next = event.relatedTarget as Node | null;
  if (!next) return;
  if (menuRef.value?.contains(next)) return;
  if (triggerRef.value?.contains(next)) return;
  close();
};

/** Navegación por flechas estilo menús (patrón WAI-ARIA). */
const onMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    closeAndFocusTrigger();
    return;
  }

  const list = items();
  if (list.length === 0) return;

  const current = list.indexOf(document.activeElement as HTMLElement);
  const focusAt = (index: number) => {
    event.preventDefault();
    list[(index + list.length) % list.length]?.focus();
  };

  switch (event.key) {
    case 'ArrowDown':
      focusAt(current + 1);
      break;
    case 'ArrowUp':
      focusAt(current <= 0 ? list.length - 1 : current - 1);
      break;
    case 'Home':
      focusAt(0);
      break;
    case 'End':
      focusAt(list.length - 1);
      break;
    case 'Tab':
      // No se intercepta: los menús pueden contener campos (p. ej. buscador de
      // organizaciones). El cierre por foco se resuelve con el focusout de abajo.
      break;
  }
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined && value !== isOpen.value) setOpen(value);
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
});

provide('ui-dropdown-close', close);

defineExpose({ open, close, toggle, isOpen });
</script>

<style>
.ui-dropdown-trigger {
  display: inline-flex;
}

.ui-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 49;
}

.ui-dropdown-menu {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-1);
  z-index: 50;
  box-shadow: var(--shadow-lg);
  animation: ui-dropdown-in 0.12s ease-out;
}

.ui-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius);
  background: transparent;
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
  font-family: inherit;
}
.ui-dropdown-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}
.ui-dropdown-item:focus-visible {
  outline: 2px solid var(--text-main);
  outline-offset: -2px;
}
.ui-dropdown-item.danger {
  color: var(--color-danger);
}
.ui-dropdown-item.danger:hover {
  background-color: var(--color-danger-bg);
}

.ui-dropdown-divider {
  height: 1px;
  background-color: var(--border);
  margin: var(--space-1) 0;
}

/* Items cómodos al tacto en Android/iPhone */
@media (pointer: coarse) {
  .ui-dropdown-item {
    min-height: 44px;
    font-size: var(--text-base);
  }
}

@keyframes ui-dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
