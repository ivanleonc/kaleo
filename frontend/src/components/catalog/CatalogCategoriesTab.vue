<template>
  <UiCard>
    <div class="tab-actions">
      <UiButton
        v-if="!entitlementsStore.isReadOnly"
        v-permission="Permissions.CATALOG.CREATE"
        width="auto"
        @click="openCreate"
      >
        <IconPlus :size="16" /> Nueva categoría
      </UiButton>
    </div>

    <UiAlert v-if="error" type="error">{{ error }}</UiAlert>

    <div v-if="isLoading" class="catalog-loading" aria-hidden="true">
      <UiSkeleton v-for="n in 4" :key="n" variant="text" width="100%" />
    </div>

    <ul v-else class="catalog-list">
      <li
        v-for="category in categories"
        :key="category.id"
        class="catalog-row"
        :style="{ paddingLeft: `${depth(category) * 20}px` }"
      >
        <span class="catalog-badge">CAT</span>
        <div class="catalog-copy">
          <div class="catalog-title-row">
            <h3>{{ category.name }}</h3>
            <UiBadge v-if="category.parent_id" label="Subcategoría" size="sm" />
          </div>
          <p class="catalog-meta">{{ parentName(category) }}</p>
        </div>
        <div v-if="!entitlementsStore.isReadOnly" class="catalog-actions">
          <UiButton
            v-permission="Permissions.CATALOG.UPDATE"
            size="sm"
            variant="ghost"
            width="auto"
            @click="openEdit(category)"
          >
            Editar
          </UiButton>
          <UiButton
            v-permission="Permissions.CATALOG.DELETE"
            size="sm"
            variant="ghost"
            width="auto"
            class="danger-action"
            @click="confirmDelete(category)"
          >
            Eliminar
          </UiButton>
        </div>
      </li>
      <li v-if="categories.length === 0" class="catalog-empty">No hay categorías.</li>
    </ul>
  </UiCard>

  <UiFormModal
    v-model="isFormOpen"
    :title="editing ? 'Editar categoría' : 'Nueva categoría'"
    :description="
      editing
        ? `Actualiza ${editing.name}.`
        : 'Las categorías agrupan ítems del catálogo y pueden anidarse.'
    "
    :submit-label="editing ? 'Guardar' : 'Crear categoría'"
    :loading="isSaving"
    footer-hint="Una categoría padre permite construir una jerarquía de catálogo."
    @submit="save"
  >
    <UiAlert v-if="formError" type="error">{{ formError }}</UiAlert>
    <UiFormSection title="Datos de la categoría" description="Nombre visible y ubicación en la jerarquía.">
      <UiInput v-model="form.name" label="Nombre" required />
      <UiSelect
        v-model="form.parentId"
        label="Categoría padre"
        :options="parentOptions"
        hint="Déjala vacía para crear una categoría raíz."
      />
    </UiFormSection>
  </UiFormModal>

  <UiConfirmDialog
    v-model="isDeleteOpen"
    title="Eliminar categoría"
    variant="danger"
    confirm-label="Eliminar"
    :loading="isDeleting"
    @confirm="remove"
  >
    ¿Eliminar <strong>{{ deleteTarget?.name }}</strong>? No debe tener subcategorías ni ítems.
  </UiConfirmDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import UiCard from '@/components/ui/UiCard.vue';
import UiButton from '@/components/ui/UiButton.vue';
import UiAlert from '@/components/ui/UiAlert.vue';
import UiBadge from '@/components/ui/UiBadge.vue';
import UiSkeleton from '@/components/ui/UiSkeleton.vue';
import UiSelect from '@/components/ui/UiSelect.vue';
import UiInput from '@/components/ui/UiInput.vue';
import UiFormModal from '@/components/ui/UiFormModal.vue';
import UiFormSection from '@/components/ui/UiFormSection.vue';
import UiConfirmDialog from '@/components/ui/UiConfirmDialog.vue';
import { IconPlus } from '@tabler/icons-vue';
import { Permissions } from '@/constants/permissions';
import { catalogService } from '@/services/catalog.service';
import { useEntitlementsStore } from '@/stores/entitlements.store';
import { useToast } from '@/composables/useToast';
import { apiErrorMessage } from '@/utils/error';
import type { ItemCategory } from '@/types/catalog';

const toast = useToast();
const entitlementsStore = useEntitlementsStore();

const categories = ref<ItemCategory[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

function depth(category: ItemCategory): number {
  return Math.max(0, category.path.split('/').filter(Boolean).length - 1);
}

function parentName(category: ItemCategory): string {
  if (!category.parent_id) return 'Categoría raíz';
  return (
    categories.value.find((item) => item.id === category.parent_id)?.name ??
    'Subcategoría'
  );
}

const parentOptions = computed(() => [
  { label: 'Sin padre (raíz)', value: '' },
  ...categories.value
    .filter((category) => category.id !== editing.value?.id)
    .map((category) => ({ label: category.name, value: category.id })),
]);

async function load(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    categories.value = await catalogService.listCategories();
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar las categorías');
  } finally {
    isLoading.value = false;
  }
}

const isFormOpen = ref(false);
const editing = ref<ItemCategory | null>(null);
const isSaving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({ name: '', parentId: '' });

function openCreate(): void {
  editing.value = null;
  form.name = '';
  form.parentId = '';
  formError.value = null;
  isFormOpen.value = true;
}

function openEdit(category: ItemCategory): void {
  editing.value = category;
  form.name = category.name;
  form.parentId = category.parent_id ?? '';
  formError.value = null;
  isFormOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    formError.value = 'El nombre es obligatorio.';
    return;
  }
  isSaving.value = true;
  formError.value = null;
  try {
    if (editing.value) {
      await catalogService.updateCategory(editing.value.id, {
        name: form.name.trim(),
        parentId: form.parentId || null,
      });
      toast.success('Categoría actualizada');
    } else {
      await catalogService.createCategory({
        name: form.name.trim(),
        parentId: form.parentId || null,
      });
      toast.success('Categoría creada');
    }
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = apiErrorMessage(err, 'No pudimos guardar la categoría');
  } finally {
    isSaving.value = false;
  }
}

const isDeleteOpen = ref(false);
const deleteTarget = ref<ItemCategory | null>(null);
const isDeleting = ref(false);

function confirmDelete(category: ItemCategory): void {
  deleteTarget.value = category;
  isDeleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await catalogService.deleteCategory(deleteTarget.value.id);
    isDeleteOpen.value = false;
    deleteTarget.value = null;
    toast.success('Categoría eliminada');
    await load();
  } catch (err) {
    toast.error(apiErrorMessage(err, 'No pudimos eliminar la categoría'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}

.catalog-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.catalog-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.catalog-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.catalog-row + .catalog-row {
  border-top: 1px solid var(--border);
}

.catalog-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 32px;
  padding: 0 var(--space-2);
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--primary);
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.catalog-copy {
  min-width: 0;
  flex: 1;
}

.catalog-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.catalog-title-row h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.catalog-meta {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.catalog-actions {
  display: flex;
  gap: var(--space-1);
}

.catalog-empty {
  padding: var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.danger-action {
  color: var(--color-danger);
}
</style>
