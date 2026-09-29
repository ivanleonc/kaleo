<template>
  <AuthLayout>
    <UiCard>
      <template #header>
        <div class="not-found-hero">
          <h2 class="auth-title">404</h2>
          <p class="auth-description">La página que buscas no existe o fue movida.</p>
          <p v-if="attemptedPath" class="attempted-path">
            <code>{{ attemptedPath }}</code>
          </p>
        </div>
      </template>

      <div class="not-found-body">
        <UiAlert v-if="isAuthenticated && !companyId" type="info">
          Aún no tienes una organización. Créala para empezar a usar el panel.
        </UiAlert>

        <template v-if="isAuthenticated && companyId">
          <p class="not-found-hint">Prueba con una de estas secciones:</p>
          <div class="shortcuts">
            <router-link
              v-for="shortcut in shortcuts"
              :key="shortcut.to"
              :to="shortcut.to"
              class="shortcut"
            >
              {{ shortcut.label }}
            </router-link>
          </div>
        </template>
      </div>

      <template #footer>
        <UiButton type="button" @click="goHome">
          {{ primaryActionLabel }}
        </UiButton>

        <div v-if="!isAuthenticated" class="auth-footer-links">
          <p>¿No tienes cuenta? <router-link to="/register">Regístrate</router-link></p>
        </div>
      </template>
    </UiCard>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyPath } from '@/composables/useCompanyPath';
import AuthLayout from '@/layouts/AuthLayout.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { companyId, companyPath } = useCompanyPath();

const isAuthenticated = computed(() => authStore.isAuthenticated);

/** Ruta pedida: ayuda a detectar enlaces profundos rotos o rutas renombradas. */
const attemptedPath = computed(() => route.fullPath);

const shortcuts = computed(() => [
  { label: 'Panel', to: companyPath('/dashboard') },
  { label: 'Miembros', to: companyPath('/members') },
  { label: 'Sucursales', to: companyPath('/branches') },
  { label: 'Configuración', to: companyPath('/settings') },
]);

const primaryActionLabel = computed(() => {
  if (!isAuthenticated.value) return 'Volver al inicio de sesión';
  return companyId.value ? 'Ir a mi panel' : 'Crear mi organización';
});

/**
 * Antes toda sesión, autenticada o no, terminaba en /login: un 404 en un panel
 * con sesión activa expulsaba al usuario de golpe sin explicación.
 */
const goHome = () => {
  if (!isAuthenticated.value) {
    router.push({ name: 'Login' });
    return;
  }
  if (!companyId.value) {
    router.push({ name: 'Onboarding' });
    return;
  }
  router.push(companyPath('/dashboard'));
};
</script>

<style scoped>
.not-found-hero {
  text-align: center;
}

.not-found-hero .auth-title {
  font-size: 3rem;
  line-height: 1;
}

.attempted-path {
  margin-top: var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-muted);
  word-break: break-all;
}

.not-found-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.not-found-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.shortcut {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-main);
  transition: background-color 0.15s, border-color 0.15s;
}

.shortcut:hover {
  background-color: var(--bg-hover);
  border-color: var(--text-main);
}
</style>
