import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'es',
  title: 'Kaleo Docs',
  description: 'Documentación oficial de Kaleo — plataforma SaaS multi-tenant',
  base: '/',

  ignoreDeadLinks: [
    // Links de localhost en la documentación de instalación
    /localhost/,
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/kaleo-logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    logo: '/kaleo-logo.svg',
    siteTitle: 'Kaleo Docs',

    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Guías', link: '/guias/' },
      {
        text: 'Referencia',
        items: [
          { text: 'Composables', link: '/frontend/composables/' },
          { text: 'Componentes UI', link: '/frontend/componentes/' },
          { text: 'API REST', link: '/backend/api/' },
        ],
      },
      { text: 'Manual de Usuario', link: '/usuario/inicio-sesion' },
      { text: 'Changelog', link: '/changelog' },
    ],

    sidebar: {
      '/inicio/': [
        {
          text: 'Empezar',
          items: [
            { text: 'Introducción', link: '/inicio/introduccion' },
            { text: 'Instalación', link: '/inicio/instalacion' },
            { text: 'Variables de entorno', link: '/inicio/variables-entorno' },
          ],
        },
      ],

      '/arquitectura/': [
        {
          text: 'Arquitectura',
          items: [
            { text: 'Visión general', link: '/arquitectura/vision-general' },
            { text: 'Monorepo', link: '/arquitectura/monorepo' },
            { text: 'Multi-tenant', link: '/arquitectura/multi-tenant' },
            { text: 'Permisos y roles', link: '/arquitectura/permisos-roles' },
            { text: 'Tokens de diseño', link: '/arquitectura/tokens-diseno' },
          ],
        },
      ],

      '/frontend/': [
        {
          text: 'Frontend',
          items: [
            { text: 'Estructura', link: '/frontend/estructura' },
            { text: 'Router y guards', link: '/frontend/router' },
            { text: 'Stores (Pinia)', link: '/frontend/stores' },
          ],
        },
        {
          text: 'Composables',
          collapsed: false,
          items: [
            { text: 'Índice', link: '/frontend/composables/' },
            { text: 'usePaginatedSetup', link: '/frontend/composables/use-paginated-setup' },
            { text: 'useTableView', link: '/frontend/composables/use-table-view' },
            { text: 'useAsyncData', link: '/frontend/composables/use-async-data' },
            { text: 'useDashboardData', link: '/frontend/composables/use-dashboard-data' },
            { text: 'useFilterSync', link: '/frontend/composables/use-filter-sync' },
            { text: 'useModal', link: '/frontend/composables/use-modal' },
            { text: 'useDirtyForm', link: '/frontend/composables/use-dirty-form' },
            { text: 'useAsyncOperation', link: '/frontend/composables/use-async-operation' },
            { text: 'useAppTable', link: '/frontend/composables/use-app-table' },
          ],
        },
        {
          text: 'Componentes UI',
          collapsed: true,
          items: [
            { text: 'Catálogo', link: '/frontend/componentes/' },
            {
              text: 'Layout',
              items: [
                { text: 'UiPageHeader', link: '/frontend/componentes/layout/ui-page-header' },
                { text: 'UiCard', link: '/frontend/componentes/layout/ui-card' },
                { text: 'UiDetailGrid', link: '/frontend/componentes/layout/ui-detail-grid' },
                { text: 'UiInfoRow', link: '/frontend/componentes/layout/ui-info-row' },
              ],
            },
            {
              text: 'Datos',
              items: [
                { text: 'UiDataTable', link: '/frontend/componentes/datos/ui-data-table' },
                { text: 'UiTableFilters', link: '/frontend/componentes/datos/ui-table-filters' },
                { text: 'UiPagination', link: '/frontend/componentes/datos/ui-pagination' },
                { text: 'UiCursorPagination', link: '/frontend/componentes/datos/ui-cursor-pagination' },
                { text: 'UiMetricCard', link: '/frontend/componentes/datos/ui-metric-card' },
              ],
            },
            {
              text: 'Formularios',
              items: [
                { text: 'UiButton', link: '/frontend/componentes/formularios/ui-button' },
                { text: 'UiInput', link: '/frontend/componentes/formularios/ui-input' },
                { text: 'UiSelect', link: '/frontend/componentes/formularios/ui-select' },
                { text: 'UiFormModal', link: '/frontend/componentes/formularios/ui-form-modal' },
                { text: 'UiConfirmDialog', link: '/frontend/componentes/formularios/ui-confirm-dialog' },
                { text: 'UiDualListbox', link: '/frontend/componentes/formularios/ui-dual-listbox' },
                { text: 'UiSearchInput', link: '/frontend/componentes/formularios/ui-search-input' },
                { text: 'UiTimezoneSelect', link: '/frontend/componentes/formularios/ui-timezone-select' },
                { text: 'UiPasswordStrength', link: '/frontend/componentes/formularios/ui-password-strength' },
              ],
            },
            {
              text: 'Feedback',
              items: [
                { text: 'UiAlert', link: '/frontend/componentes/feedback/ui-alert' },
                { text: 'UiBadge', link: '/frontend/componentes/feedback/ui-badge' },
                { text: 'UiAvatar', link: '/frontend/componentes/feedback/ui-avatar' },
                { text: 'UiSkeleton', link: '/frontend/componentes/feedback/ui-skeleton' },
                { text: 'UiEmptyState', link: '/frontend/componentes/feedback/ui-empty-state' },
                { text: 'UiErrorState', link: '/frontend/componentes/feedback/ui-error-state' },
                { text: 'UiToast', link: '/frontend/componentes/feedback/ui-toast' },
                { text: 'UiOfflineBanner', link: '/frontend/componentes/feedback/ui-offline-banner' },
                { text: 'UiExportButton', link: '/frontend/componentes/feedback/ui-export-button' },
                { text: 'UiChart', link: '/frontend/componentes/feedback/ui-chart' },
              ],
            },
          ],
        },
      ],

      '/backend/': [
        {
          text: 'Backend',
          items: [
            { text: 'Estructura', link: '/backend/estructura' },
            { text: 'Guards', link: '/backend/guards' },
            { text: 'Repositorios SQL', link: '/backend/repositorios' },
            { text: 'Emails', link: '/backend/emails' },
            { text: 'Migraciones', link: '/backend/migraciones' },
          ],
        },
        {
          text: 'API REST',
          items: [
            { text: 'Convenciones', link: '/backend/api/' },
            { text: 'Autenticación', link: '/backend/api/auth' },
            { text: 'Empresas', link: '/backend/api/companies' },
            { text: 'Miembros', link: '/backend/api/members' },
            { text: 'Sedes', link: '/backend/api/branches' },
            { text: 'Roles y Permisos', link: '/backend/api/roles' },
            { text: 'Auditoría', link: '/backend/api/audit' },
          ],
        },
      ],

      '/guias/': [
        {
          text: 'Guías de Desarrollo',
          items: [
            { text: '¿Por dónde empezar?', link: '/guias/' },
            { text: 'Nuevo CRUD tabular', link: '/guias/nuevo-crud' },
            { text: 'Nuevo reporte', link: '/guias/nuevo-reporte' },
            { text: 'Nuevo dashboard', link: '/guias/nuevo-dashboard' },
            { text: 'Vista de detalle', link: '/guias/nueva-vista-detalle' },
            { text: 'Módulos relacionados', link: '/guias/modulos-relacionados' },
            { text: 'Checklist pre-PR', link: '/guias/checklist' },
          ],
        },
      ],

      '/usuario/': [
        {
          text: 'Manual de Usuario',
          items: [
            { text: 'Iniciar sesión', link: '/usuario/inicio-sesion' },
            { text: 'Mi cuenta', link: '/usuario/cuenta' },
            { text: 'Empresa', link: '/usuario/empresa' },
            { text: 'Miembros del equipo', link: '/usuario/miembros' },
            { text: 'Sedes', link: '/usuario/sedes' },
            { text: 'Roles y permisos', link: '/usuario/roles-permisos' },
            { text: 'Auditoría', link: '/usuario/auditoria' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/ivanleonc/kaleo/edit/main/docs/:path',
      text: 'Editar esta página',
    },

    lastUpdated: {
      text: 'Actualizado el',
    },

    docFooter: {
      prev: 'Anterior',
      next: 'Siguiente',
    },

    outline: {
      label: 'En esta página',
      level: [2, 3],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ivanleonc/kaleo' },
    ],

    footer: {
      message: 'Documentación de Kaleo — plataforma SaaS multi-tenant',
      copyright: '© 2026 Kaleo. Todos los derechos reservados.',
    },
  },
})
