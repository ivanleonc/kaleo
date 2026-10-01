import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    // Limitar la búsqueda al directorio del backend para que no suba al
    // monorepo raíz y encuentre tsconfig.node.json del frontend.
    tsconfigPaths({ root: './' }),
  ],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
