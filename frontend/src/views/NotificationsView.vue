<template>
  <AuthenticatedLayout>
    <div class="notifications-container">
      <UiPageHeader
        title="Notificaciones"
        subtitle="Avisos de operaciones, documentos y actividad de tu cuenta."
      >
        <template #actions>
          <UiButton
            v-if="notificationsStore.unreadCount > 0"
            variant="outline"
            width="auto"
            :loading="isMarkingAll"
            @click="markAllRead"
          >
            Marcar todas como leídas
          </UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="notificationsStore.error" type="error">
        {{ notificationsStore.error }}
      </UiAlert>

      <div class="notifications-toolbar" role="group" aria-label="Filtrar notificaciones">
        <UiButton
          size="sm"
          width="auto"
          :variant="filter === 'all' ? 'primary' : 'outline'"
          @click="filter = 'all'"
        >
          Todas
        </UiButton>
        <UiButton
          size="sm"
          width="auto"
          :variant="filter === 'unread' ? 'primary' : 'outline'"
          @click="filter = 'unread'"
        >
          No leídas ({{ notificationsStore.unreadCount }})
        </UiButton>
      </div>

      <UiCard>
        <div v-if="notificationsStore.isLoading && notifications.length === 0" class="notifications-loading" aria-hidden="true">
          <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
        </div>

        <UiEmptyState
          v-else-if="notifications.length === 0"
          :title="filter === 'unread' ? 'No tienes notificaciones sin leer' : 'Todavía no hay notificaciones'"
          description="Aquí aparecerán los avisos cuando terminen tus exportaciones o se actualicen tus documentos."
        >
          <template #icon>
            <IconBell :size="48" stroke-width="1.5" />
          </template>
        </UiEmptyState>

        <ul v-else class="notifications-list">
          <li v-for="notification in notifications" :key="notification.id">
            <button
              type="button"
              class="notification-row"
              :class="{ 'is-unread': !notification.read_at }"
              @click="openNotification(notification)"
            >
              <span class="notification-row-icon" aria-hidden="true">
                <IconBell :size="18" stroke-width="1.8" />
              </span>
              <span class="notification-row-copy">
                <span class="notification-row-title">
                  {{ notification.title }}
                  <span v-if="!notification.read_at" class="notification-unread-dot" aria-label="Sin leer"></span>
                </span>
                <span v-if="notification.body" class="notification-row-body">{{ notification.body }}</span>
                <span class="notification-row-meta">
                  {{ categoryLabel(notification.category) }} ·
                  {{ formatRelativeTime(notification.created_at) }}
                </span>
              </span>
              <IconChevronRight :size="16" class="notification-row-chevron" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </UiCard>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import { IconBell, IconChevronRight } from '@tabler/icons-vue';
import { useNotificationsStore } from '@/stores/notifications.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useToast } from '@/composables/useToast';
import { formatRelativeTime } from '@/utils/date';
import { apiErrorMessage } from '@/utils/error';
import type { AppNotification } from '@/types/notification';

const router = useRouter();
const { companyId, companyPath } = useCompanyPath();
const notificationsStore = useNotificationsStore();
const toast = useToast();

const filter = ref<'all' | 'unread'>('all');
const isMarkingAll = ref(false);

const notifications = computed(() => notificationsStore.items);

const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operaciones',
  documents: 'Documentos',
  security: 'Seguridad',
  system: 'Sistema',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function load(): void {
  if (!companyId.value) return;
  void notificationsStore.load(companyId.value, {
    unreadOnly: filter.value === 'unread',
    limit: 100,
  });
}

async function openNotification(notification: AppNotification): Promise<void> {
  try {
    await notificationsStore.markRead(notification.id);
  } catch {
    // La navegación no depende del marcado como leído.
  }
  if (filter.value === 'unread') load();
  if (notification.link) router.push(companyPath(notification.link));
}

async function markAllRead(): Promise<void> {
  isMarkingAll.value = true;
  try {
    await notificationsStore.markAllRead();
    if (filter.value === 'unread') load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos marcar las notificaciones como leídas'));
  } finally {
    isMarkingAll.value = false;
  }
}

onMounted(load);
watch(filter, load);
watch(() => companyId.value, load);
</script>

<style scoped>
.notifications-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.notifications-toolbar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.notifications-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notifications-list li + li {
  border-top: 1px solid var(--border);
}

.notification-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--text-muted);
  border-radius: var(--radius);
}

.notification-row:hover {
  background: var(--bg-hover);
}

.notification-row.is-unread {
  background: var(--primary-active);
}

.notification-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--bg-app);
  color: var(--primary);
  flex-shrink: 0;
}

.notification-row-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.notification-row-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-main);
  font-size: var(--text-sm);
  font-weight: 500;
}

.notification-unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}

.notification-row-body {
  font-size: var(--text-sm);
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.notification-row-meta {
  font-size: var(--text-xs);
  color: var(--text-light);
}

.notification-row-chevron {
  color: var(--text-light);
  flex-shrink: 0;
  margin-top: 6px;
}
</style>
