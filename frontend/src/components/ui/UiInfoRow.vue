<template>
  <!--
    UiInfoRow — Par etiqueta / valor para vistas de detalle.

    Elimina el CSS duplicado de info-grid/info-row/info-label/info-value
    que estaba copiado en SettingsView y ProfileView. El valor puede ser
    texto plano, un badge, un avatar, o cualquier elemento inline.

    Uso dentro de UiDetailGrid:
    ```html
    <UiDetailGrid>
      <UiInfoRow label="Nombre">{{ company.name }}</UiInfoRow>
      <UiInfoRow label="Estado"><UiBadge variant="success">Activa</UiBadge></UiInfoRow>
    </UiDetailGrid>
    ```
  -->
  <div class="info-row">
    <span class="info-label">{{ label }}</span>
    <span class="info-value">
      <slot></slot>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Etiqueta del campo (columna izquierda). */
  label: string;
}>();
</script>

<style scoped>
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
  gap: var(--space-4);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--text-main);
  font-weight: 600;
  text-align: right;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
}
</style>
