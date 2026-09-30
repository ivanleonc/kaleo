<template>
  <Teleport to="body">
    <!--
      Cada toast lleva su propio rol: `alert` (asertiva) en errores y
      `status` (polite) en el resto. Por eso el contenedor no declara
      aria-live: se anunciaría dos veces.
    -->
    <div class="ui-toast-stack">
      <TransitionGroup name="ui-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['ui-toast', `ui-toast-${toast.type}`]"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          @mouseenter="pause(toast.id)"
          @mouseleave="resume(toast.id)"
          @focusin="pause(toast.id)"
          @focusout="resume(toast.id)"
        >
          <IconCircleCheck v-if="toast.type === 'success'" :size="18" stroke-width="2" class="toast-icon" />
          <IconAlertTriangle v-else-if="toast.type === 'warning'" :size="18" stroke-width="2" class="toast-icon" />
          <IconAlertCircle v-else-if="toast.type === 'error'" :size="18" stroke-width="2" class="toast-icon" />
          <IconInfoCircle v-else :size="18" stroke-width="2" class="toast-icon" />
          <span class="toast-message">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            type="button"
            class="toast-action"
            @click="runAction(toast)"
          >
            {{ toast.action.label }}
          </button>
          <button type="button" class="toast-close" @click="dismiss(toast.id)" aria-label="Cerrar notificación">
            <IconX :size="14" stroke-width="2" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  IconCircleCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconAlertTriangle,
  IconX,
} from '@tabler/icons-vue';
import { useToast } from '@/composables/useToast';

const { toasts, dismiss, pause, resume, runAction } = useToast();
</script>

<style scoped>
.ui-toast-stack {
  position: fixed;
  bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  right: var(--space-6);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: min(22rem, calc(100vw - 2 * var(--space-6)));
}

@media (max-width: 640px) {
  .ui-toast-stack {
    left: var(--space-4);
    right: var(--space-4);
    max-width: none;
  }
}

@media (pointer: coarse) {
  .toast-close,
  .toast-action {
    min-height: 32px;
  }
}

.ui-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: 500;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-main);
  box-shadow: var(--shadow-lg);
}

.ui-toast-success { border-left: 3px solid var(--color-success); }
.ui-toast-success .toast-icon { color: var(--color-success); }
.ui-toast-error { border-left: 3px solid var(--color-danger); }
.ui-toast-error .toast-icon { color: var(--color-danger); }
.ui-toast-warning { border-left: 3px solid var(--color-warning); }
.ui-toast-warning .toast-icon { color: var(--color-warning); }
.ui-toast-info .toast-icon { color: var(--text-muted); }

.toast-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.toast-action {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.toast-action:hover {
  color: var(--primary-hover);
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  flex-shrink: 0;
}
.toast-close:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.ui-toast-enter-active, .ui-toast-leave-active {
  transition: all 0.2s ease-out;
}
.ui-toast-enter-from, .ui-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
