# Introducción

**Kaleo** es una plataforma SaaS multi-tenant diseñada para que organizaciones gestionen su equipo, sedes, roles y accesos desde una interfaz unificada. Cada empresa tiene su propio espacio aislado con usuarios, roles y datos independientes.

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Vue 3 + Vite | Vue 3.5+ |
| Estado | Pinia | v3 |
| Tablas | TanStack Vue Table | v9 |
| Backend | NestJS | v12 |
| Base de datos | PostgreSQL (Supabase) | — |
| ORM/Queries | TypeORM DataSource | v1 |
| Autenticación | JWT (access 15min + refresh 7d) | — |
| Email | Brevo API → SMTP → stub | — |
| Monorepo | Turborepo + npm workspaces | — |
| Tests | Vitest | v4 |
| TypeScript | Strict mode | v6 |

## Principios del proyecto

### Multi-tenant por empresa
Cada request autenticado lleva el header `x-company-id` (UUID) que identifica la empresa activa. Los guards del backend validan que el usuario pertenezca a esa empresa antes de ejecutar cualquier operación.

### JWT sin estado en el servidor
Los tokens de acceso expiran en **15 minutos**. El refresh token (7 días) permite renovarlos silenciosamente. Al revocar sesión, los access tokens se añaden a una blacklist.

### RBAC por empresa
Los permisos son granulares (`users:read`, `branches:create`, etc.) y se asignan a través de roles configurables por empresa. Los roles `Owner`, `Admin` y `Viewer` son del sistema; las empresas pueden crear roles personalizados.

### SQL directo con tipos
El backend usa TypeORM únicamente como gestor de conexiones. Todas las queries son SQL plano, tipadas con `rows<T>()` y `row<T>()`. Esto facilita una futura migración a Kysely o Drizzle.

## Estructura del repositorio

```
kaleo/
├── backend/          NestJS API
├── frontend/         Vue 3 SPA
├── packages/
│   └── shared/       Permisos, roles y tipos compartidos
├── docs/             Este sitio de documentación (VitePress)
├── scripts/          Utilidades de CI/mantenimiento
└── turbo.json        Configuración de Turborepo
```

## Navegación rápida

<div class="tip custom-block">

**Soy desarrollador nuevo en el proyecto** → Empieza por [Instalación](/inicio/instalacion), luego [Arquitectura](/arquitectura/vision-general).

**Quiero crear un nuevo módulo** → Ve directamente a [Guías de desarrollo](/guias/).

**Necesito integrar la API** → Ve a [API REST — Convenciones](/backend/api/).

**Soy usuario final** → Ve al [Manual de usuario](/usuario/inicio-sesion).

</div>
