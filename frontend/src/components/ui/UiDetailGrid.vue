<template>
  <!--
    UiDetailGrid — Contenedor para grupos de UiInfoRow.

    Provee la estructura semántica y el separador visual para listas
    de pares label/valor. Reemplaza el div.info-grid duplicado en
    SettingsView y ProfileView.

    Uso:
    ```html
    <UiDetailGrid>
      <UiInfoRow label="Nombre">{{ entity.name }}</UiInfoRow>
      <UiInfoRow label="Estado">
        <UiBadge variant="success">Activo</UiBadge>
      </UiInfoRow>
    </UiDetailGrid>
    ```
  -->
  <div class="ui-detail-grid">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
// Sin props por ahora: el contenedor es puramente estructural.
// Si en el futuro se necesitan columnas (grid 2-col), se agrega aquí.
</script>

<style scoped>
.ui-detail-grid {
  display: flex;
  flex-direction: column;
}
</style>
