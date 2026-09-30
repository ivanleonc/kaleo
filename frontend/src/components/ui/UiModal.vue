<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="attemptClose">
      <!-- Confirmación de descarte: se sustituye el contenido para no anidar modales. -->
      <div
        v-if="isConfirming"
        class="modal-content modal-small"
        role="alertdialog"
        aria-modal="true"
        :aria-label="confirmMessage"
      >
        <div class="modal-confirm">
          <p class="modal-confirm-text">{{ confirmMessage }}</p>
          <div class="modal-confirm-actions">
            <UiButton variant="ghost" size="sm" width="auto" @click="cancelConfirm">
              Seguir editando
            </UiButton>
            <UiButton variant="danger" size="sm" width="auto" @click="confirmDiscard">
              Descartar
            </UiButton>
          </div>
        </div>
      </div>

      <div
        v-else
        ref="contentRef"
        class="modal-content"
        :class="`modal-${size}`"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
        tabindex="-1"
      >
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import UiButton from '@/components/ui/UiButton.vue';

interface Props {
  size?: 'small' | 'default' | 'large';
  label?: string;
  confirmOnDirty?: boolean;
  dirty?: boolean;
  confirmMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  label: 'Diálogo',
  confirmOnDirty: false,
  dirty: false,
  confirmMessage: 'Tienes cambios sin guardar. ¿Cerrar de todos modos?',
});

const isOpen = defineModel<boolean>({ default: false });
const contentRef = ref<HTMLElement | null>(null);
const isConfirming = ref(false);
let lastFocused: HTMLElement | null = null;
let previousBodyOverflow = '';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const focusFirst = () => {
  const first = contentRef.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  (first || contentRef.value)?.focus();
};

const focusables = (): HTMLElement[] => {
  if (!contentRef.value) return [];
  return Array.from(
    contentRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.offsetParent !== null);
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    attemptClose();
    return;
  }

  if (event.key !== 'Tab') return;
  const items = focusables();
  if (items.length === 0) {
    event.preventDefault();
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !contentRef.value?.contains(active))) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
};

const close = () => {
  isOpen.value = false;
};

const confirmDiscard = () => {
  isConfirming.value = false;
  close();
};

const cancelConfirm = () => {
  isConfirming.value = false;
  nextTick(() => focusFirst());
};

const attemptClose = () => {
  if (props.confirmOnDirty && props.dirty) {
    // Confirmación dentro del propio modal: window.confirm se ve ajeno al diseño
    // y no se puede estilar ni traducir de forma consistente.
    isConfirming.value = true;
    return;
  }
  close();
};

// `immediate` es necesario: si el modal nace abierto (v-model ya en true al
// montarse) sin él no se instalarían el bloqueo de scroll ni el foco/Escape.
watch(isOpen, (value) => {
  if (value) {
    lastFocused = document.activeElement as HTMLElement | null;
    isConfirming.value = false;
    // Bloquea el scroll del fondo mientras el modal está abierto.
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nextTick(() => {
      focusFirst();
      window.addEventListener('keydown', onKeydown, true);
    });
  } else {
    window.removeEventListener('keydown', onKeydown, true);
    document.body.style.overflow = previousBodyOverflow;
    lastFocused?.focus?.();
    lastFocused = null;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true);
  if (isOpen.value) document.body.style.overflow = previousBodyOverflow;
});

defineExpose({ close, attemptClose });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  animation: modal-in 0.2s ease-out;
}

.modal-confirm {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-confirm-text {
  font-size: var(--text-base);
  color: var(--text-main);
  line-height: 1.45;
}

.modal-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.modal-small { max-width: 340px; }
.modal-default { max-width: 400px; }
.modal-large { max-width: 600px; }

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0.5rem;
    align-items: flex-end;
  }
  .modal-content {
    max-height: calc(100vh - 1rem);
    max-height: calc(100dvh - 1rem);
  }
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
