# Changelog

Todos los cambios significativos se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [1.0.0] — 2026-10-03

### Añadido

#### Plataforma
- Arquitectura SaaS multi-tenant: cada empresa tiene datos completamente aislados
- Autenticación JWT con access token (15 min) + refresh token (7 días)
- Blacklist de access tokens revocados (logout real)
- Sistema RBAC con roles del sistema (Owner, Admin, Viewer) + roles personalizados por empresa
- Flag `is_super_admin` para acceso virtual a todas las empresas (solo via SQL)
- Cambio de email con verificación de doble confirmación
- Política de contraseña: 8+ caracteres, mayúscula, minúscula, número
- Historial de contraseñas (no se puede reusar las últimas 3)

#### Backend (NestJS + TypeORM + PostgreSQL)
- 9 módulos de dominio: auth, members, company, branches, rbac, audit, email, two-factor
- Repositorios con SQL crudo tipado (`rows<T>()`, `row<T>()`, `typedQuery<T>()`)
- Guards globales: ThrottlerGuard, JwtAuthGuard, PasswordChangedGuard, CompanyAccessGuard
- `AuditLogInterceptor` global: registra todo, sanitiza campos sensibles
- Paginación por cursor en audit logs (eficiente en tablas grandes)
- Retención automática de audit logs (365 días)
- Adaptadores de email: Brevo API → SMTP → stub
- Migraciones SQL versionadas 000–017
- Validación de variables de entorno al arrancar con Joi

#### Frontend (Vue 3 + Pinia + TanStack Table v9)
- 100% Composition API con `<script setup>`
- 5 stores Pinia con Setup Store style
- `usePaginatedSetup`: factory de stores paginados (elimina ~80 líneas por módulo)
- `useTableView`: configura tablas TanStack en 1 línea
- `useAsyncData`: carga asíncrona no-paginada con loading/error/reload
- `useDashboardData`: múltiples fetches paralelos con estado unificado
- `useFilterSync`: un watcher para todos los filtros (evita filtros "muertos")
- `useModal<T>`: estado tipado de modales
- `useDirtyForm`: detección de cambios sin guardar
- Interceptor axios: cola de refresh (evita múltiples refreshes paralelos)

#### Sistema de diseño
- 32 componentes `Ui*` sin dependencias de frameworks CSS externos
- Tokens de diseño completos en CSS custom properties (70+ variables)
- Modo oscuro automático via clase `.dark`
- `UiFormModal` con footer por defecto configurable via props
- `UiDetailGrid` + `UiInfoRow` para vistas de detalle
- `UiMetricCard` para dashboards con estado skeleton

#### Módulos de la aplicación
- **Dashboard**: métricas de miembros, roles, empresa
- **Miembros**: lista paginada con filtros, invitar, editar, multi-empresa, resetear contraseña
- **Sedes**: CRUD completo con sede principal, activar/desactivar con undo
- **Roles y Permisos**: roles sistema + personalizados, asignación via dual listbox
- **Auditoría**: timeline paginado por cursor, filtros, exportar CSV
- **Configuración**: editar empresa con protección de slug
- **Perfil**: editar datos, cambio de email con verificación, cambio de contraseña

#### Documentación
- Sitio VitePress con ~68 páginas
- Documentación para 3 audiencias: devs, integradores, usuarios finales
- Referencia completa de 32 componentes UI con props, slots y ejemplos
- Documentación de 10 composables core con API y casos de uso
- API REST documentada con todos los endpoints (auth, companies, members, branches, roles, audit)
- 5 guías de desarrollo: CRUD, reporte, dashboard, vista de detalle, módulos relacionados
- Checklist pre-PR unificado

#### Monorepo
- Turborepo + npm workspaces (backend, frontend, packages/shared, docs)
- `packages/shared`: fuente de verdad de permisos y roles (backend + frontend)
- Script `check:permissions` para verificar sincronización de permisos en CI

### Tecnologías

| Capa | Stack | Versión |
|---|---|---|
| Frontend | Vue 3 + Vite | 3.5+ |
| Estado | Pinia | v3 |
| Tablas | TanStack Vue Table | v9 |
| Backend | NestJS | v12 |
| Base de datos | PostgreSQL vía Supabase | — |
| ORM/Queries | TypeORM DataSource | v1 |
| Tests | Vitest | v4 |
| TypeScript | Strict | v6 |
| Docs | VitePress | v1.6 |
