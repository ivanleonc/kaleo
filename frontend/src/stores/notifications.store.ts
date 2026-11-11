import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { AppNotification } from '@/types/notification';
import { notificationService } from '@/services/notification.service';
import { apiErrorMessage } from '@/utils/error';

/**
 * Notificaciones del usuario activo.
 *
 * El topbar la refresca en segundo plano cada 30 s y la vista completa la
 * recarga al entrar. El store no conoce la empresa: `load` la recibe y, si
 * cambia, descarta la lista anterior para no mezclar tenants.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const loadedCompanyId = ref<string | null>(null);
  const error = ref<string | null>(null);

  async function load(
    companyId: string,
    options: { silent?: boolean; unreadOnly?: boolean; limit?: number } = {},
  ): Promise<void> {
    if (loadedCompanyId.value !== companyId) {
      items.value = [];
      unreadCount.value = 0;
      loadedCompanyId.value = companyId;
    }

    if (!options.silent) isLoading.value = true;
    error.value = null;
    try {
      const response = await notificationService.list({
        unreadOnly: options.unreadOnly,
        limit: options.limit ?? 20,
      });
      items.value = response.data.items;
      unreadCount.value = response.data.unreadCount;
    } catch (err) {
      error.value = apiErrorMessage(err, 'No pudimos cargar las notificaciones');
    } finally {
      isLoading.value = false;
    }
  }

  async function markRead(id: string): Promise<void> {
    const target = items.value.find((item) => item.id === id);
    if (target?.read_at) return;

    await notificationService.markRead(id);
    if (target && !target.read_at) {
      target.read_at = new Date().toISOString();
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllRead(): Promise<number> {
    const updated = await notificationService.markAllRead();
    const now = new Date().toISOString();
    items.value = items.value.map((item) => ({
      ...item,
      read_at: item.read_at ?? now,
    }));
    unreadCount.value = 0;
    return updated;
  }

  function reset(): void {
    items.value = [];
    unreadCount.value = 0;
    loadedCompanyId.value = null;
    error.value = null;
  }

  return {
    items,
    unreadCount,
    isLoading,
    error,
    loadedCompanyId,
    load,
    markRead,
    markAllRead,
    reset,
  };
});
