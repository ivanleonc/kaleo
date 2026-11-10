<template>
  <AuthenticatedLayout>
    <div class="modules-admin-container">
      <UiPageHeader
        title="Módulos de la plataforma"
        subtitle="Activa o desactiva módulos para la empresa activa."
      />

      <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

      <div v-if="isLoading" class="modules-grid" aria-hidden="true">
        <UiCard v-for="n in 6" :key="n">
          <UiSkeleton variant="title" width="60%" />
          <UiSkeleton variant="text" width="90%" />
          <UiSkeleton variant="text" width="40%" />
        </UiCard>
      </div>

      <UiEmptyState
        v-else-if="catalog.length === 0"
        title="Sin módulos registrados"
        description="El catálogo de módulos está vacío."
      />

      <div v-else class="modules-grid">
        <UiCard v-for="module in catalog" :key="module.code" class="module-card">
          <template #header>
            <div class="module-card-header">
              <div>
                <h3 class="module-title">{{ module.name }}</h3>
                <p class="module-code">{{ module.code }} · v{{ module.version }}</p>
              </div>
              <UiBadge size="sm" :variant="module.isCore ? 'info' : isEnabled(module.code) ? 'success' : 'neutral'">
                {{ module.isCore ? 'Core' : isEnabled(module.code) ? 'Activo' : 'Inactivo' }}
              </UiBadge>
            </div>
          </template>

          <p v-if="module.vertical" class="module-meta">
            Vertical: <strong>{{ module.vertical }}</strong>
          </p>
          <p v-if="module.dependsOn.length > 0" class="module-meta">
            Depende de: <span class="module-deps">{{ module.dependsOn.join(', ') }}</span>
          </p>
          <p v-else class="module-meta">Sin dependencias.</p>

          <div class="module-footer">
            <span v-if="module.isCore" class="module-note">
              Los módulos core siempre están activos.
            </span>
            <UiButton
              v-else
              variant="outline"
              size="sm"
              width="auto"
              :loading="savingCode === module.code"
              :disabled="savingCode !== null"
              @click="toggle(module)"
            >
              {{ isEnabled(module.code) ? 'Desactivar' : 'Activar' }}
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  </AuthenticatedLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { EnabledModule, ModuleManifest } from '@saas/shared';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue';
import UiPageHeader from '@/components/ui/UiPageHeader.vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiEmptyState from '@/components/ui/UiEmptyState.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import { moduleService } from '@/services/module.service';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';

const toast = useToast();
const catalog = ref<ModuleManifest[]>([]);
const enabledModules = ref<EnabledModule[]>([]);
const isLoading = ref(true);
const savingCode = ref<string | null>(null);
const error = ref<string | null>(null);

function isEnabled(code: string): boolean {
  return enabledModules.value.some((module) => module.code === code);
}

async function load() {
  isLoading.value = true;
  error.value = null;
  try {
    const [catalogResponse, enabledResponse] = await Promise.all([
      moduleService.getCatalog(),
      moduleService.getModules(),
    ]);
    catalog.value = catalogResponse.data;
    enabledModules.value = enabledResponse.data;
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudieron cargar los módulos');
  } finally {
    isLoading.value = false;
  }
}

async function toggle(module: ModuleManifest) {
  if (module.isCore) return;

  savingCode.value = module.code;
  error.value = null;
  const next = !isEnabled(module.code);
  try {
    await moduleService.setModule(module.code, next);
    toast.success(next ? 'Módulo activado' : 'Módulo desactivado');
    await load();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo actualizar el módulo');
  } finally {
    savingCode.value = null;
  }
}

onMounted(load);
</script>

<style scoped>
.modules-admin-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.module-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.module-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-main);
}

.module-code {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.module-meta {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.module-deps {
  font-family: var(--font-mono);
  color: var(--text-main);
}

.module-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.module-note {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
