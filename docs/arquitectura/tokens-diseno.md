# Tokens de Diseño

Kaleo usa un sistema de diseño propio basado en **CSS custom properties** (variables CSS). No usa Tailwind, Bootstrap ni ningún framework de CSS. Todos los componentes `Ui*` referencian exclusivamente estas variables.

El sistema está definido en `frontend/src/assets/main.css` y soporta **modo oscuro** automático via la clase `.dark` en `<html>`.

## Activar / desactivar modo oscuro

```ts
// frontend/src/composables/useTheme.ts
const { isDark, toggle } = useTheme()
toggle() // añade/quita .dark en <html>
```

El modo oscuro persiste en `localStorage` y también respeta `prefers-color-scheme` del sistema operativo.

---

## Fondos

| Token | Valor claro | Uso |
|---|---|---|
| `--bg-app` | `#f9fafb` | Fondo principal de la aplicación |
| `--bg-card` | `#ffffff` | Fondo de tarjetas y modales |
| `--bg-sidebar` | `#ffffff` | Fondo del sidebar |
| `--bg-navbar` | `#ffffff` | Fondo de la barra de navegación superior |
| `--bg-hover` | `rgba(0,0,0,0.04)` | Estado hover en listas e ítems |
| `--bg-input` | `#ffffff` | Fondo de inputs y selects |
| `--bg-elevated` | `#ffffff` | Elementos flotantes (dropdowns, tooltips) |

## Bordes

| Token | Valor | Uso |
|---|---|---|
| `--border` | `#e5e7eb` | Borde estándar en cards, inputs, tablas |
| `--border-light` | `#f3f4f6` | Borde sutil, separadores secundarios |

## Tipografía / Texto

| Token | Uso |
|---|---|
| `--text-main` | Texto principal, contenido primario |
| `--text-muted` | Texto secundario, etiquetas, metadatos |
| `--text-light` | Texto terciario, placeholders activos |
| `--text-placeholder` | Placeholders de inputs |

## Color primario (verde Kaleo)

| Token | Valor |
|---|---|
| `--primary` | `#1c9c5a` |
| `--primary-hover` | `#158a4c` |
| `--primary-foreground` | `#ffffff` |
| `--primary-active` | `#0d7a3e` |
| `--focus-ring` | `rgba(28, 156, 90, 0.3)` |

## Colores de estado

Cada estado tiene 4 tokens: base, fondo (`-bg`), borde (`-border`) y texto (`-text`).

| Estado | Base | Uso |
|---|---|---|
| `--color-success` | `#16a34a` | Operaciones exitosas, estado activo |
| `--color-warning` | `#d97706` | Advertencias, estados temporales |
| `--color-danger` | `#dc2626` | Errores, acciones destructivas |
| `--color-info` | `#2563eb` | Información neutral |

```css
/* Ejemplo de uso en componente */
.alert-error {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger-text);
}
```

## Colores de acento

| Token | Uso típico |
|---|---|
| `--accent-purple` / `--accent-purple-bg` | Roles, permisos, métricas |
| `--accent-blue` / `--accent-blue-bg` | Miembros, información, acciones primarias |
| `--accent-green` / `--accent-green-bg` | Éxito, estados activos, empresa |
| `--accent-orange` / `--accent-orange-bg` | Advertencias, estados pendientes |
| `--accent-amber` / `--accent-amber-bg` | Tags especiales (Owner, Principal) |

## Colores de módulo

Cada módulo tiene su color de identificación visual:

| Token | Módulo |
|---|---|
| `--module-auth` | Autenticación |
| `--module-users` | Usuarios / Miembros |
| `--module-roles` | Roles y permisos |
| `--module-company` | Empresa |
| `--module-settings` | Configuración |
| `--module-profile` | Perfil |
| `--module-dashboard` | Dashboard |
| `--module-branches` | Sedes |
| `--module-audit` | Auditoría |
| `--module-billing` | Facturación |
| `--module-notifications` | Notificaciones |
| `--module-integrations` | Integraciones |

## Sombras

| Token | Uso |
|---|---|
| `--shadow-sm` | Cards en reposo |
| `--shadow` | Cards en hover, dropdowns |
| `--shadow-md` | Modales, elementos flotantes |
| `--shadow-lg` | Diálogos, popovers |

## Espaciado

El sistema usa una escala de 8 niveles donde `--space-1 = 0.25rem` (4px):

| Token | Valor | px |
|---|---|---|
| `--space-0` | `0` | 0 |
| `--space-1` | `0.25rem` | 4 |
| `--space-2` | `0.5rem` | 8 |
| `--space-3` | `0.75rem` | 12 |
| `--space-4` | `1rem` | 16 |
| `--space-5` | `1.25rem` | 20 |
| `--space-6` | `1.5rem` | 24 |
| `--space-8` | `2rem` | 32 |
| `--space-10` | `2.5rem` | 40 |
| `--space-12` | `3rem` | 48 |
| `--space-16` | `4rem` | 64 |

## Radios de borde

| Token | Valor | Uso típico |
|---|---|---|
| `--radius-sm` | `0.375rem` | Badges, inputs pequeños |
| `--radius` | `0.5rem` | Botones, inputs, tags |
| `--radius-lg` | `0.75rem` | Cards, dropdowns |
| `--radius-xl` | `1rem` | Modales |
| `--radius-full` | `9999px` | Avatares, indicadores circulares |

## Tipografía

### Escala de tamaños

| Token | Valor | Uso |
|---|---|---|
| `--text-xs` | `0.75rem` | Metadatos, badges, timestamps |
| `--text-sm` | `0.875rem` | Texto de interfaz secundario |
| `--text-base` | `0.9375rem` | Texto base de interfaz |
| `--text-md` | `1rem` | Texto de lectura |
| `--text-lg` | `1.125rem` | Títulos de cards |
| `--text-xl` | `1.5rem` | Títulos de sección |

### Familias tipográficas

| Token | Valor |
|---|---|
| `--font-sans` | `Inter, ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace` |

## Tokens de layout

| Token | Valor | Descripción |
|---|---|---|
| `--sidebar-width` | `220px` | Ancho del sidebar expandido |
| `--sidebar-collapsed` | `52px` | Ancho del sidebar colapsado |
| `--topbar-height` | `48px` | Altura de la barra de navegación superior |

## Tokens de diff (auditoría)

Usados en `AuditLogEntry.vue` para mostrar cambios antes/después:

| Token | Uso |
|---|---|
| `--diff-add-bg` | Fondo de líneas agregadas |
| `--diff-add-text` | Texto de líneas agregadas |
| `--diff-remove-bg` | Fondo de líneas eliminadas |
| `--diff-remove-text` | Texto de líneas eliminadas |

## Cómo usar tokens en componentes

```vue
<style scoped>
.my-component {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  color: var(--text-main);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-sm);
}

.my-component:hover {
  border-color: var(--text-light);
  box-shadow: var(--shadow);
}
</style>
```

::: tip
Nunca uses valores hardcodeados como `#ffffff`, `#1f2937`, `16px`, etc. en los estilos de los componentes. Siempre referencia los tokens. Así el modo oscuro funciona automáticamente.
:::
