# Catálogo de Componentes UI

32 componentes del sistema de diseño, organizados por categoría. Todos usan exclusivamente **CSS custom properties** del sistema de tokens — sin dependencias de frameworks externos.

## Layout

| Componente | Descripción |
|---|---|
| [UiPageHeader](/frontend/componentes/layout/ui-page-header) | Cabecera de página con título, subtítulo y slot `#actions` |
| [UiCard](/frontend/componentes/layout/ui-card) | Contenedor de tarjeta con `#header` y `#footer` opcionales |
| [UiDetailGrid](/frontend/componentes/layout/ui-detail-grid) | Contenedor para grupos de `UiInfoRow` (vistas de detalle) |
| [UiInfoRow](/frontend/componentes/layout/ui-info-row) | Par label/valor con borde inferior |

## Datos

| Componente | Descripción |
|---|---|
| [UiDataTable](/frontend/componentes/datos/ui-data-table) | Tabla TanStack con slots por columna, skeleton, empty state y error |
| [UiTableFilters](/frontend/componentes/datos/ui-table-filters) | Barra de filtros (search, select, date) con escape-hatch por slot |
| [UiPagination](/frontend/componentes/datos/ui-pagination) | Paginación offset con selector de tamaño de página |
| [UiCursorPagination](/frontend/componentes/datos/ui-cursor-pagination) | Paginación por cursor (para audit logs) |
| [UiMetricCard](/frontend/componentes/datos/ui-metric-card) | Tarjeta de KPI para dashboards |

## Formularios

| Componente | Descripción |
|---|---|
| [UiButton](/frontend/componentes/formularios/ui-button) | Botón con variantes, loading spinner y tamaños |
| [UiInput](/frontend/componentes/formularios/ui-input) | Input de texto con label, error y toggle de contraseña |
| [UiSelect](/frontend/componentes/formularios/ui-select) | Select nativo con opciones tipadas |
| [UiFormModal](/frontend/componentes/formularios/ui-form-modal) | Modal de formulario con footer por defecto y protección dirty |
| [UiConfirmDialog](/frontend/componentes/formularios/ui-confirm-dialog) | Diálogo de confirmación con confirmación tipada opcional |
| [UiDualListbox](/frontend/componentes/formularios/ui-dual-listbox) | Selector dual (disponibles / asignados) para permisos |
| [UiSearchInput](/frontend/componentes/formularios/ui-search-input) | Input de búsqueda con botón de limpiar |
| [UiTimezoneSelect](/frontend/componentes/formularios/ui-timezone-select) | Selector de zona horaria IANA con búsqueda |
| [UiPasswordStrength](/frontend/componentes/formularios/ui-password-strength) | Indicador visual de fortaleza de contraseña |

## Feedback

| Componente | Descripción |
|---|---|
| [UiAlert](/frontend/componentes/feedback/ui-alert) | Alerta de tipo error/success/warning/info con slots de icono y título |
| [UiBadge](/frontend/componentes/feedback/ui-badge) | Etiqueta de estado con variantes de color |
| [UiAvatar](/frontend/componentes/feedback/ui-avatar) | Avatar con imagen, iniciales o icono fallback |
| [UiSkeleton](/frontend/componentes/feedback/ui-skeleton) | Placeholder de carga animado |
| [UiEmptyState](/frontend/componentes/feedback/ui-empty-state) | Estado vacío con icono, título y acción |
| [UiErrorState](/frontend/componentes/feedback/ui-error-state) | Estado de error con reintentar |
| [UiToast](/frontend/componentes/feedback/ui-toast) | Notificaciones toast (usar via `useToast()`) |
| [UiOfflineBanner](/frontend/componentes/feedback/ui-offline-banner) | Banner automático cuando el navegador está offline |
| [UiExportButton](/frontend/componentes/feedback/ui-export-button) | Botón de descarga de archivos (CSV, etc.) |
| [UiChart](/frontend/componentes/feedback/ui-chart) | Wrapper de ECharts para gráficas |

## Convenciones de componentes UI

- Todos tienen prefijo `Ui` (PascalCase)
- Sin lógica de dominio — completamente genéricos
- Estilos via CSS custom properties (`var(--bg-card)`, `var(--border)`, etc.)
- Accesibles: `role`, `aria-*`, `aria-label`, focus management donde aplica
- Dark mode automático via tokens (no requieren cambios)
- Props con `withDefaults` y tipos explícitos en TypeScript
