<template>
  <Transition name="offline-slide">
    <div
      v-if="!isOnline"
      class="offline-banner"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <IconWifiOff :size="16" stroke-width="1.8" aria-hidden="true" />
      <span>Sin conexión — los cambios no se guardarán hasta que vuelva el internet.</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { IconWifiOff } from '@tabler/icons-vue';
import { useOnlineStatus } from '@/composables/useOnlineStatus';

const { isOnline } = useOnlineStatus();
</script>

<style scoped>
.offline-banner {
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;

  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);

  background: var(--color-warning, #b45309);
  color: #fff;
  border-radius: var(--radius-full, 9999px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-size: var(--font-sm, 0.875rem);
  font-weight: 500;
  white-space: nowrap;

  /* Área táctil mínima */
  min-height: 44px;
}

/* Respeta prefers-reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .offline-slide-enter-active,
  .offline-slide-leave-active {
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  .offline-slide-enter-from,
  .offline-slide-leave-to {
    transform: translateX(-50%) translateY(120%);
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .offline-banner {
    left: var(--space-4);
    right: var(--space-4);
    transform: none;
    white-space: normal;
    border-radius: var(--radius-lg, 0.5rem);
  }

  @media (prefers-reduced-motion: no-preference) {
    .offline-slide-enter-from,
    .offline-slide-leave-to {
      transform: translateY(120%);
      opacity: 0;
    }
  }
}
</style>
