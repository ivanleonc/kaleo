import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auditService } from '@/services/audit.service';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { AuditLog, AuditFilters } from '@/types/audit';

/**
 * Auditoría paginada por cursor.
 *
 * Sin cursor solo se puede avanzar hacia atrás en el tiempo, así que no existe
 * "ir a la página 47". Para conservar la navegación hacia atrás se apila el
 * cursor usado en cada página visitada: `cursorStack[i]` es el cursor que pide
 * la página `i`, y el índice 0 es `null` (la más reciente).
 */
export const useAuditStore = defineStore('audit', () => {
  const logs = ref<AuditLog[]>([]);
  const limit = ref(20);
  const entityTypes = ref<string[]>([]);
  const filters = ref<AuditFilters>({});

  const cursorStack = ref<Array<string | null>>([null]);
  const nextCursor = ref<string | null>(null);
  const hasNext = ref(false);

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error al cargar la auditoría' });

  const pageIndex = computed(() => cursorStack.value.length - 1);
  const hasPrev = computed(() => pageIndex.value > 0);
  const canGoNext = computed(() => hasNext.value && nextCursor.value !== null);

  async function fetchLogs() {
    const cursor = cursorStack.value[pageIndex.value];
    const result = await withLoading(
      () =>
        auditService.getLogs({
          limit: limit.value,
          cursor: cursor ?? undefined,
          ...filters.value,
        }),
      'Error al cargar la auditoría',
    );
    if (!result) return;
    logs.value = result.data;
    hasNext.value = result.hasNext;
    nextCursor.value = result.nextCursor;
  }

  function nextPage() {
    if (!canGoNext.value) return;
    cursorStack.value = [...cursorStack.value, nextCursor.value];
    fetchLogs();
  }

  function prevPage() {
    if (!hasPrev.value) return;
    cursorStack.value = cursorStack.value.slice(0, -1);
    fetchLogs();
  }

  async function fetchEntityTypes() {
    const result = await withLoading(
      () => auditService.getEntityTypes(),
      'Error al cargar los tipos de entidad',
    );
    if (result) entityTypes.value = result.data;
  }

  function setFilters(f: AuditFilters) {
    filters.value = f;
    cursorStack.value = [null];
    fetchLogs();
  }

  function resetFilters() {
    filters.value = {};
    cursorStack.value = [null];
    fetchLogs();
  }

  return {
    logs, limit, isLoading, error, entityTypes, filters,
    pageIndex, hasPrev, canGoNext,
    fetchLogs, fetchEntityTypes, nextPage, prevPage, setFilters, resetFilters,
  };
});
