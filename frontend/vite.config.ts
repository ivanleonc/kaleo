import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      // Alias para imports cortos dentro del frontend
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Alias para @saas/shared: resuelve el paquete compartido del monorepo
      // en runtime (Vite y Vitest lo necesitan además del path alias de tsconfig).
      '@saas/shared': resolve(__dirname, '../packages/shared/src/index.ts'),
    },
  },
})
