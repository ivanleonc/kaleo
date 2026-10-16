import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...vueA11y.configs['flat/recommended'],

  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ['src/__tests__/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    rules: {
      // App.vue y componentes de una sola palabra del kit no aportan aquí.
      'vue/multi-word-component-names': 'off',
      // El orden de atributos actual es intencional (v-permission tras :to, etc.).
      'vue/attributes-order': 'off',
      // El proyecto usa v-html solo con contenido controlado (no hay usos hoy).
      'vue/no-v-html': 'error',
      // Los props opcionales se tipan con TS; la regla duplica esa validación.
      'vue/require-default-prop': 'off',
      // Misma decisión que el backend (.oxlintrc.json): el código usa `any`
      // deliberadamente en catches de axios, mocks de test y genéricos de TanStack.
      '@typescript-eslint/no-explicit-any': 'off',
      // Los `{}` son argumentos de tipo de TanStack Table (AppVueTable), no tipos vacíos.
      '@typescript-eslint/no-empty-object-type': 'off',
      // Los catches vacíos llevan comentario explicando por qué (store maneja el error).
      'no-empty': ['error', { allowEmptyCatch: true }],
      // El default exige nesting Y for a la vez; el proyecto usa label anidado
      // (opciones dinámicas) o for/id dinámico (:for): cualquiera de los dos basta.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },

  prettier,
);
