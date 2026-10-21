<template>
  <div class="ui-file-dropzone">
    <span v-if="label" :id="labelId" class="dropzone-label">{{ label }}</span>
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- el arrastre complementa el input de archivo accesible. -->
    <label
      :for="inputId"
      class="dropzone"
      :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }"
      :aria-disabled="disabled || undefined"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        :id="inputId"
        class="file-input"
        type="file"
        :accept="accept || undefined"
        :disabled="disabled"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="resolvedHint ? hintId : undefined"
        @change="onInputChange"
      />
      <span class="dropzone-content">
        <slot name="icon">
          <IconFileSpreadsheet class="dropzone-icon" :size="32" stroke-width="1.5" />
        </slot>
        <span class="dropzone-title">
          <slot name="title">
            Arrastra el archivo aquí o <span class="dropzone-link">selecciónalo</span>
          </slot>
        </span>
        <span v-if="resolvedHint" :id="hintId" class="dropzone-hint">
          {{ resolvedHint }}
        </span>
      </span>
    </label>

    <div v-if="modelValue" class="file-row">
      <div class="file-main">
        <IconFileSpreadsheet :size="20" stroke-width="1.8" />
        <div class="file-text">
          <span class="file-name" :title="modelValue.name">{{ modelValue.name }}</span>
          <span class="file-size">{{ formatFileSize(modelValue.size) }}</span>
        </div>
      </div>
      <button
        v-if="!disabled"
        type="button"
        class="file-remove"
        :aria-label="`Quitar ${modelValue.name}`"
        @click="clearFile"
      >
        <IconX :size="16" stroke-width="1.8" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { IconFileSpreadsheet, IconX } from '@tabler/icons-vue';
import { formatFileSize } from '@/utils/number';

const props = withDefaults(defineProps<{
  modelValue: File | null;
  label?: string;
  accept?: string;
  maxSize?: number;
  hint?: string;
  disabled?: boolean;
}>(), {
  label: 'Archivo',
  accept: '',
  hint: '',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', file: File | null): void;
}>();

const inputId = `ui-file-dropzone-${useId()}`;
const labelId = `${inputId}-label`;
const hintId = `${inputId}-hint`;
const isDragging = ref(false);
let dragDepth = 0;

const acceptText = computed(() => {
  if (!props.accept) return '';
  const tokens = props.accept.split(',').map((token) => token.trim()).filter(Boolean);
  return tokens.every((token) => token.startsWith('.'))
    ? `Formatos ${tokens.join(', ')}`
    : `Formatos permitidos: ${tokens.join(', ')}`;
});

const resolvedHint = computed(() => {
  if (props.hint) return props.hint;
  return [
    acceptText.value,
    props.maxSize ? `Máximo ${formatFileSize(props.maxSize)}` : '',
  ].filter(Boolean).join(' · ');
});

function onDragEnter() {
  if (props.disabled) return;
  dragDepth += 1;
  isDragging.value = true;
}

function onDragOver() {
  if (props.disabled) return;
  isDragging.value = true;
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) isDragging.value = false;
}

function onDrop(event: DragEvent) {
  dragDepth = 0;
  isDragging.value = false;
  if (props.disabled) return;

  const file = event.dataTransfer?.files?.[0];
  if (file) emit('update:modelValue', file);
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('update:modelValue', file);
  input.value = '';
}

function clearFile() {
  emit('update:modelValue', null);
}
</script>

<style scoped>
.ui-file-dropzone {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dropzone-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1;
}

.dropzone {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 160px;
  padding: var(--space-6);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--bg-app);
  transition: border-color 0.15s, background-color 0.15s;
  cursor: pointer;
}

.dropzone:hover,
.dropzone:focus-within,
.dropzone.is-dragging {
  border-color: var(--primary);
  background-color: var(--color-primary-light);
}

.dropzone.is-disabled {
  pointer-events: none;
  opacity: 0.65;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.dropzone-icon {
  color: var(--primary);
}

.dropzone-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.dropzone-link,
:slotted(.dropzone-link) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.dropzone-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.file-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  color: var(--primary);
}

.file-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.file-remove {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.file-remove:hover {
  background-color: var(--bg-card);
  color: var(--color-danger);
}

.file-remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .dropzone {
    min-height: 140px;
    padding: var(--space-5);
  }
}

@media (pointer: coarse) {
  .file-remove {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
