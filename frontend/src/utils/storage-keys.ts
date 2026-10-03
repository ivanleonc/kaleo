/**
 * Claves de almacenamiento local — fuente única de verdad.
 *
 * Si algún día se vuelve a cambiar la marca, solo hay que editar los valores
 * `kaleo_*` de abajo (y agregar la entrada vieja a `LEGACY_MAPPINGS` para que
 * los usuarios existentes no pierdan su sesión).
 */

export const STORAGE_KEYS = {
  activeTenant: 'kaleo_active_tenant',
  authStorage: 'kaleo_auth_storage',
  user: 'kaleo_user',
  sessionExpired: 'kaleo_session_expired',
  accessToken: 'kaleo_access_token',
  refreshToken: 'kaleo_refresh_token',
  sidebarPinned: 'kaleo:sidebar-pinned',
} as const;

/**
 * Migración única `saas_*` → `kaleo_*` (rebrand 2026).
 *
 * Si el usuario tiene sesión con las claves viejas y aún no tiene las nuevas,
 * se copian los valores. Las claves viejas se conservan (no se borran) para
 * no romper un posible downgrade; este helper puede retirarse en 1-2 releases.
 */
const LEGACY_MAPPINGS: Array<{
  oldKey: string;
  newKey: string;
  session?: boolean;
}> = [
  { oldKey: 'saas_active_tenant', newKey: STORAGE_KEYS.activeTenant },
  { oldKey: 'saas_auth_storage', newKey: STORAGE_KEYS.authStorage },
  { oldKey: 'saas_user', newKey: STORAGE_KEYS.user },
  { oldKey: 'saas_session_expired', newKey: STORAGE_KEYS.sessionExpired, session: true },
  { oldKey: 'saas_access_token', newKey: STORAGE_KEYS.accessToken },
  { oldKey: 'saas_refresh_token', newKey: STORAGE_KEYS.refreshToken },
  { oldKey: 'saasapp:sidebar-pinned', newKey: STORAGE_KEYS.sidebarPinned },
];

export function migrateStorageKeys(): void {
  try {
    for (const { oldKey, newKey, session } of LEGACY_MAPPINGS) {
      const store = session ? sessionStorage : localStorage;
      if (store.getItem(newKey) == null) {
        const legacy = store.getItem(oldKey);
        if (legacy != null) store.setItem(newKey, legacy);
      }
    }
  } catch {
    // Almacenamiento no disponible (SSR, modo privado estricto): la app
    // sigue funcionando, el usuario simplemente inicia sesión de nuevo.
  }
}
