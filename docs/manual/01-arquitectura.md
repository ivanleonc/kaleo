# 01 — Arquitectura del Proyecto

## Mapa general

```
kaleo/
├── backend/          NestJS + TypeORM + PostgreSQL (Supabase)
├── frontend/         Vue 3 + Pinia + TanStack Table
└── packages/
    └── shared/       Permisos, roles y tipos compartidos entre back y front
```

## Frontend — dónde vive cada cosa

```
frontend/src/
├── api/              Instancia axios con interceptores (auth, refresh, errores)
├── assets/           main.css — tokens de diseño (colores, espaciado, tipografía)
├── composables/      Lógica reutilizable (core de la arquitectura)
│   ├── createPaginatedStore.ts   Factory de stores paginados
│   ├── useTableView.ts           Setup de tabla en 1 línea
│   ├── useAsyncData.ts           Carga asíncrona no-paginada
│   ├── useDashboardData.ts       Fetches paralelos para dashboards
│   ├── useFilterSync.ts          Sincroniza filtros con el store
│   ├── useModal.ts               Estado de modal genérico tipado
│   ├── useDirtyForm.ts           Detección de cambios sin guardar
│   └── useAsyncOperation.ts      loading/error para operaciones CRUD
├── components/
│   ├── ui/           Sistema de diseño: UiButton, UiCard, UiDataTable…
│   └── features/     Componentes de dominio por módulo
│       ├── members/  MemberTable, MemberStatusBadge
│       ├── branches/ BranchTable
│       ├── roles/    RoleCard
│       └── audit/    AuditLogEntry
├── constants/        Permisos, roles, brand (re-exportan packages/shared)
├── directives/       v-permission
├── layouts/          AuthenticatedLayout, AuthLayout
├── router/           index.ts — rutas + guards de autenticación/permisos
├── services/         Una clase por recurso (llaman a apiClient)
├── stores/           Pinia: auth, member, branch, audit, company
├── types/            Interfaces TypeScript por entidad
├── utils/            Helpers de error, texto, fechas, tokens
└── views/            Una view por página/ruta
```

## Backend — dónde vive cada cosa

```
backend/src/
├── auth/             JWT, refresh tokens, registro, sesión, contraseñas
├── members/          CRUD de usuarios por empresa
├── company/          Empresas multi-tenant
├── branches/         Sedes
├── rbac/             Roles y permisos customizables por empresa
├── audit/            Interceptor global + paginación por cursor
├── email/            Brevo API → SMTP → stub
├── common/
│   ├── config/       Validación de variables de entorno (Joi)
│   ├── constants/    Permisos y roles (espejo de packages/shared)
│   ├── decorators/   @Public, @RequirePermissions, @Roles, @CurrentUser
│   ├── dto/          DTOs compartidos (paginación, respuesta API)
│   ├── filters/      SentryExceptionFilter
│   ├── guards/       JWT, CompanyAccess, Permissions, Roles, SuperAdmin
│   ├── middleware/   RequestLogger (pino)
│   ├── types/        db-rows.ts — tipos de filas SQL
│   └── utils/        db.ts (rows<T>, row<T>), sql.helper, transaction.helper
└── migrations/       SQL versionado 000–017
```

## Capas y flujo de datos

```
Browser
  └─ View (views/*.vue)
       └─ Feature Component (components/features/**/*.vue)
            └─ Ui Component (components/ui/Ui*.vue)
       └─ Composable (composables/use*.ts)
            └─ Store (stores/*.store.ts)
                 └─ Service (services/*.service.ts)
                      └─ apiClient (api/axios.ts)
                           └─ Backend API
                                └─ Repository (repositories/*.ts)
                                     └─ PostgreSQL (Supabase)
```

## Reglas de arquitectura

| Regla | Razón |
|---|---|
| Las views no llaman a `apiClient` directamente | Todo pasa por el store o un composable |
| Los stores paginados usan `usePaginatedSetup` | Evita 80 líneas de boilerplate idéntico |
| Los componentes feature emiten eventos, no modifican el store | Separación de presentación y estado |
| Los componentes Ui* no tienen lógica de dominio | Son reutilizables entre módulos |
| Los repositorios usan `rows<T>()` y `row<T>()` | Centraliza el cast desde `any[]` |
| `packages/shared` es la fuente de verdad de permisos y roles | Backend y frontend nunca se desincronían |
