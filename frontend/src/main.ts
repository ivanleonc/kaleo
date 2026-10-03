import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router';
import { permissionDirective } from './directives/permission';
import { initSentry } from './lib/sentry';
import { migrateStorageKeys } from './utils/storage-keys';

// Estilos globales (si usas Tailwind o CSS normal)
import './assets/main.css';

// 0. Migrar claves legacy `saas_*` → `kaleo_*` ANTES de que Pinia lea el
// storage persistido. Sin esto, los usuarios existentes perderían su sesión
// con el rebrand.
migrateStorageKeys();

const app = createApp(App);

// 1. Instanciar Pinia PRIMERO
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// 2. Instanciar el Router SEGUNDO
// Así el router.beforeEach puede consumir useAuthStore() de Pinia sin crashear
app.use(router);
app.directive('permission', permissionDirective);

// 3. Sentry DESPUÉS del router (necesita la instancia para trazar navegaciones)
initSentry(app, router);

// 4. Montar la aplicación
app.mount('#app');
