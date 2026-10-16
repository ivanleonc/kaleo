<template>
  <div class="layout-container">
    <!-- Atajo de teclado: salta la navegación lateral al contenido principal -->
    <a class="skip-link" href="#contenido-principal">Saltar al contenido principal</a>

    <AppTopbar />

    <div class="layout-body" :class="{ 'is-pinned-layout': isSidebarPinned }">
      <div v-if="isMobileSidebarOpen" class="mobile-backdrop" role="presentation" @click="closeMobileSidebar"></div>

      <AppSidebar />

      <main id="contenido-principal" class="main-content" tabindex="-1">
        <!--
          La clave fuerza el remount en cada ruta, lo que reinicia la animación
          de entrada. Se limita a cambios de empresa/ruta de sección: en la
          paginación interna volver a animar molesta más de lo que aporta.
        -->
        <div :key="viewKey" class="view-transition">
          <slot></slot>
        </div>
      </main>
    </div>

    <!-- Banner de sin conexión: aparece fijo en la parte inferior -->
    <UiOfflineBanner />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useSidebar } from '@/composables/useSidebar';
import AppTopbar from '@/components/layout/AppTopbar.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import UiOfflineBanner from '@/components/ui/UiOfflineBanner.vue';

const route = useRoute();
const { companyId } = useCompanyPath();
const { isSidebarPinned, isMobileSidebarOpen, closeMobileSidebar } = useSidebar();

// Ruta "de sección": cambia la vista, pero no la paginación interna de una tabla.
const viewKey = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  // /:companyId/:seccion
  return `${companyId.value ?? ''}/${segments[1] ?? ''}`;
});

// Cerrar el cajón móvil al navegar (sin robar el foco: la vista es la nueva interacción)
watch(() => route.path, () => {
  isMobileSidebarOpen.value = false;
});
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-app);
}

/* Enlace de salto: oculto hasta recibir el foco por teclado */
.skip-link {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 200;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  color: var(--text-main);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform 0.15s ease-out;
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Al saltar, el <main> no debe mostrar un contorno de foco gigante */
.main-content:focus {
  outline: none;
}

/* Transición de entrada al cambiar de vista. El override global de
   prefers-reduced-motion en main.css la desactiva por completo. */
.view-transition {
  animation: view-in 0.18s ease-out;
}

@keyframes view-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* LAYOUT BODY */
.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* MAIN CONTENT */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6) var(--space-8);
  background-color: var(--bg-app);
  margin-left: var(--sidebar-collapsed);
  transition: margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

/*
 * Solo el modo fijado ("Anclar") empuja el contenido: el expand por hover
 * sigue siendo un overlay encima de la vista. En móvil el cajón es
 * off-canvas, así que el empuje solo existe en desktop.
 * `min-width: 769px` es la frontera complementaria exacta del breakpoint
 * oficial 768px (no un breakpoint nuevo): a 768 el cajón sigue siendo móvil.
 */
@media (min-width: 769px) {
  .layout-body.is-pinned-layout .main-content {
    margin-left: var(--sidebar-width);
  }
}

.mobile-backdrop {
  display: none;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 19;
  }
  .main-content {
    margin-left: 0;
    padding: var(--space-4);
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: var(--space-3);
  }
}
</style>
