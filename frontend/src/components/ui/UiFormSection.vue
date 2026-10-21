<template>
  <section class="ui-form-section">
    <header v-if="title || description || $slots.aside" class="section-header">
      <div class="section-copy">
        <h3 v-if="title" class="section-title">{{ title }}</h3>
        <p v-if="description" class="section-description">{{ description }}</p>
      </div>
      <div v-if="$slots.aside" class="section-aside">
        <slot name="aside" />
      </div>
    </header>
    <div class="section-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  description?: string;
}>(), {
  title: '',
  description: '',
});
</script>

<style scoped>
.ui-form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ui-form-section + .ui-form-section {
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-light);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.section-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.01em;
}

.section-description {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.section-aside {
  flex-shrink: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .section-header {
    flex-direction: column;
    gap: var(--space-2);
  }
}
</style>
