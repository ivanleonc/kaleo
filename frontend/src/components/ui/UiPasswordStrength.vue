<template>
  <div v-if="modelValue" class="ui-password-strength">
    <div class="strength-bar">
      <div
        class="strength-fill"
        :class="strength"
        :style="{ width: `${percent}%` }"
        role="progressbar"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Fortaleza de la contraseña: ${label}`"
      ></div>
    </div>
    <span class="strength-label" :class="strength">{{ label }}</span>

    <ul class="requirements">
      <li v-for="requirement in requirements" :key="requirement.key" :class="{ met: requirement.met }">
        <span class="req-icon" aria-hidden="true">{{ requirement.met ? '✓' : '○' }}</span>
        {{ requirement.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  passwordRequirements,
  passwordStrength,
  passwordStrengthLabel,
  passwordStrengthPercent,
} from '@/utils/password';

/**
 * Barra de fortaleza + checklist de requisitos.
 *
 * Estaban duplicados casi literalmente en ChangePasswordView y ProfileView
 * (y ausentes en RegisterView, donde el usuario descubría los requisitos al
 * fallar el registro).
 */
const modelValue = defineModel<string>({ default: '' });

const strength = computed(() => passwordStrength(modelValue.value));
const percent = computed(() => passwordStrengthPercent(modelValue.value));
const label = computed(() => passwordStrengthLabel(modelValue.value));
const requirements = computed(() => passwordRequirements(modelValue.value));
</script>

<style scoped>
.ui-password-strength {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.strength-bar {
  height: 4px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.2s ease, background-color 0.2s ease;
}

.strength-fill.weak { background-color: var(--color-danger); }
.strength-fill.fair { background-color: var(--accent-amber); }
.strength-fill.strong { background-color: var(--color-success); }

.strength-label {
  font-size: var(--text-xs);
  font-weight: 500;
}

.strength-label.weak { color: var(--color-danger); }
.strength-label.fair { color: var(--accent-amber); }
.strength-label.strong { color: var(--color-success); }

.requirements {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.requirements li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.requirements li.met {
  color: var(--color-success);
}

.req-icon {
  font-size: var(--text-sm);
  line-height: 1;
}
</style>
