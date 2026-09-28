<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="attemptClose">
      <div
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
let lastFocused: HTMLElement | null = null;

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

const attemptClose = () => {
  if (props.confirmOnDirty && props.dirty) {
    if (!window.confirm(props.confirmMessage)) return;
  }
  close();
};

watch(isOpen, (value) => {
  if (value) {
    lastFocused = document.activeElement as HTMLElement | null;
    nextTick(() => {
      focusFirst();
      window.addEventListener('keydown', onKeydown, true);
    });
  } else {
    window.removeEventListener('keydown', onKeydown, true);
    lastFocused?.focus?.();
    lastFocused = null;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true);
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
  overflow-y: auto;
  animation: modal-in 0.2s ease-out;
}

.modal-small { max-width: 340px; }
.modal-default { max-width: 400px; }
.modal-large { max-width: 600px; }

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
