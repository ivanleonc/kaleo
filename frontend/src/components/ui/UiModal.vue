<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" role="presentation" @click.self="attemptClose">
      <div
        v-if="isConfirming"
        ref="contentRef"
        class="modal-content modal-small modal-confirm"
        role="alertdialog"
        aria-modal="true"
        :aria-label="confirmMessage"
        tabindex="-1"
      >
        <div class="modal-confirm-heading">
          <span class="modal-confirm-icon" aria-hidden="true">
            <IconAlertTriangle :size="20" stroke-width="1.8" />
          </span>
          <div class="modal-confirm-copy">
            <h2 class="modal-confirm-title">Descartar cambios</h2>
            <p class="modal-confirm-text">{{ confirmMessage }}</p>
          </div>
        </div>
        <div class="modal-confirm-actions">
          <UiButton variant="ghost" size="sm" width="auto" @click="cancelConfirm">
            Seguir editando
          </UiButton>
          <UiButton variant="danger" size="sm" width="auto" @click="confirmDiscard">
            Descartar
          </UiButton>
        </div>
      </div>

      <div
        v-else
        ref="contentRef"
        class="modal-content"
        :class="[`modal-${size}`, { 'has-no-body': hideBody }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledby || undefined"
        :aria-label="labelledby ? undefined : label"
        :aria-describedby="describedby || undefined"
        tabindex="-1"
      >
        <header v-if="$slots.header" class="modal-header">
          <div class="modal-header-content">
            <slot name="header" />
          </div>
          <button
            v-if="showClose"
            type="button"
            class="modal-close"
            :aria-label="closeLabel"
            :title="closeLabel"
            @click="attemptClose"
          >
            <IconX :size="18" stroke-width="1.8" />
          </button>
        </header>

        <button
          v-else-if="showClose"
          type="button"
          class="modal-close is-floating"
          :aria-label="closeLabel"
          :title="closeLabel"
          @click="attemptClose"
        >
          <IconX :size="18" stroke-width="1.8" />
        </button>

        <div
          v-if="!hideBody"
          class="modal-body"
          :class="{ 'has-floating-close': !$slots.header && showClose }"
        >
          <slot></slot>
        </div>

        <footer v-if="$slots.footer" class="modal-footer-shell">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { IconAlertTriangle, IconX } from '@tabler/icons-vue';
import UiButton from '@/components/ui/UiButton.vue';

interface Props {
  size?: 'small' | 'default' | 'large';
  label?: string;
  labelledby?: string;
  describedby?: string;
  showClose?: boolean;
  closeLabel?: string;
  hideBody?: boolean;
  confirmOnDirty?: boolean;
  dirty?: boolean;
  confirmMessage?: string;
  preventClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  label: 'Diálogo',
  labelledby: '',
  describedby: '',
  showClose: true,
  closeLabel: 'Cerrar',
  hideBody: false,
  confirmOnDirty: false,
  dirty: false,
  confirmMessage: 'Tienes cambios sin guardar. ¿Cerrar de todos modos?',
  preventClose: false,
});

const isOpen = defineModel<boolean>({ default: false });
const contentRef = ref<HTMLElement | null>(null);
const isConfirming = ref(false);
let lastFocused: HTMLElement | null = null;
let previousBodyOverflow = '';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const focusFirst = () => {
  if (!contentRef.value) return;
  const preferred = contentRef.value.querySelector<HTMLElement>('[data-autofocus]');
  const bodyTarget = contentRef.value
    .querySelector<HTMLElement>('.modal-body')
    ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  const footerTarget = contentRef.value.querySelector<HTMLElement>(
    '.modal-footer-shell button:not([disabled])',
  );
  const fallback = contentRef.value.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  (preferred || bodyTarget || footerTarget || fallback || contentRef.value).focus();
};

const focusables = (): HTMLElement[] => {
  if (!contentRef.value) return [];
  return Array.from(
    contentRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null);
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    if (isConfirming.value) {
      cancelConfirm();
      return;
    }
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
  if (isConfirming.value) {
    cancelConfirm();
    return;
  }
  if (props.preventClose) return;
  if (props.confirmOnDirty && props.dirty) {
    isConfirming.value = true;
    return;
  }
  close();
};

watch(isOpen, (value) => {
  if (value) {
    lastFocused = document.activeElement as HTMLElement | null;
    isConfirming.value = false;
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

watch(isConfirming, (value) => {
  if (!value) return;
  nextTick(() => {
    contentRef.value
      ?.querySelector<HTMLElement>('.modal-confirm-actions button')
      ?.focus();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true);
  if (isOpen.value) document.body.style.overflow = previousBodyOverflow;
});

defineExpose({ close, attemptClose });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vh, 2rem);
  background-color: rgba(7, 10, 8, 0.56);
  backdrop-filter: blur(6px);
  animation: overlay-in 0.18s ease-out;
}

.modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: min(860px, calc(100dvh - 2rem));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-modal);
  outline: none;
  animation: modal-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.modal-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.modal-header-content {
  flex: 1;
  min-width: 0;
}

.modal-body {
  flex: 1;
  min-height: 0;
  padding: var(--space-5) var(--space-6) var(--space-6);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.modal-body.has-floating-close {
  padding-top: calc(var(--space-4) + 2.75rem);
}

.modal-content.has-no-body .modal-header {
  border-bottom: 0;
}

.modal-footer-shell {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border);
  background-color: var(--bg-sidebar);
}

.modal-close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.modal-close:hover {
  border-color: var(--border);
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.modal-close:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.modal-close.is-floating {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 2;
}

.modal-small { max-width: 400px; }
.modal-default { max-width: 560px; }
.modal-large { max-width: 740px; }

.modal-confirm {
  gap: var(--space-5);
  padding: var(--space-6);
}

.modal-confirm-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.modal-confirm-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-full);
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.modal-confirm-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.modal-confirm-title {
  font-size: var(--text-md);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-main);
}

.modal-confirm-text {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-muted);
}

.modal-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-content {
    max-width: 100% !important;
    max-height: 92dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    animation: sheet-in 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .modal-header {
    padding: var(--space-5) var(--space-5) var(--space-4);
  }

  .modal-body {
    padding: var(--space-4) var(--space-5) var(--space-5);
  }

  .modal-footer-shell {
    padding: var(--space-4) var(--space-5) calc(var(--space-4) + env(safe-area-inset-bottom));
  }

  .modal-footer-shell :deep(.modal-footer) {
    flex-direction: column-reverse;
  }

  .modal-footer-shell :deep(.modal-footer .ui-button) {
    width: 100%;
  }

  .modal-close {
    width: 2.75rem;
    height: 2.75rem;
  }

  .modal-confirm {
    max-width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  }
}

@media (pointer: coarse) {
  .modal-close {
    width: 2.75rem;
    height: 2.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .modal-content {
    animation: none;
  }
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes sheet-in {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
