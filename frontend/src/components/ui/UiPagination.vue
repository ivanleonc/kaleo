<template>
  <div v-if="totalPages > 1" class="pagination">
    <button
      type="button"
      class="page-btn"
      :disabled="page <= 1"
      @click="$emit('update:page', page - 1)"
    >
      Anterior
    </button>
    <span class="page-info">
      Página {{ page }} de {{ totalPages }}
    </span>
    <button
      type="button"
      class="page-btn"
      :disabled="page >= totalPages"
      @click="$emit('update:page', page + 1)"
    >
      Siguiente
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  page?: number;
  total?: number;
  limit?: number;
}>(), {
  page: 1,
  total: 0,
  limit: 20,
});

defineEmits<{
  (e: 'update:page', page: number): void;
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

.page-btn {
  height: 2rem;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) {
  background: var(--text-main);
  color: var(--bg-card);
  border-color: var(--text-main);
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@media (pointer: coarse) {
  .page-btn {
    min-height: 44px;
  }
}
</style>
