# Monorepo

Kaleo usa **Turborepo** con **npm workspaces** para gestionar múltiples paquetes en un solo repositorio.

## Estructura de workspaces

```
kaleo/
├── backend/       NestJS API        → workspace "backend"
├── frontend/      Vue 3 SPA         → workspace "frontend"
├── packages/
│   └── shared/    Tipos compartidos → workspace "@saas/shared"
└── docs/          Documentación     → workspace "docs"
```

## `packages/shared` — fuente de verdad compartida

Este paquete es importado tanto por el backend como por el frontend. Garantiza que permisos y roles nunca se desincronicen entre ambos lados.

```
packages/shared/src/
├── permissions.ts   Objeto Permissions + PermissionCode + ALL_PERMISSION_CODES
├── roles.ts         SystemRoles, SystemRoleName, PROTECTED_ROLES, IMMUTABLE_ROLES
├── api-types.ts     ApiResponse<T>, PagedResponse<T>, CursorResponse<T>, PaginationParams
└── index.ts         Re-exporta todo lo anterior
```

### Cómo se importa

```ts
// En el frontend (via alias tsconfig)
import { Permissions } from '@saas/shared'

// En el backend
import { Permissions } from '../../common/constants/permissions.js'
// (que a su vez re-exporta desde packages/shared)
```

::: tip
El backend tiene copias locales de los permisos/roles en `common/constants/` para no crear dependencia circular en el contexto de NestJS. Un script de CI (`check:permissions`) verifica que estén sincronizados con `packages/shared`.
:::

## Scripts de Turborepo

Desde la raíz del proyecto:

```bash
# Construir todos los workspaces en paralelo
npm run build           # turbo run build

# Correr todos los tests
npm test                # turbo run test

# TypeCheck estricto en frontend y backend
npm run typecheck       # turbo run typecheck

# Linting
npm run lint            # turbo run lint

# Formatear código
npm run format          # turbo run format
```

## Scripts de desarrollo

```bash
# Levantar backend + frontend simultáneamente
npm run dev

# Solo el backend (kaleo-dev, .env.development)
npm run dev --prefix backend

# Solo el frontend
npm run dev --prefix frontend

# Backend con datos reales (kaleo-prod, .env.production)
npm run dev:prod

# Documentación (este sitio)
npm run docs:dev
```

## Hoisting de dependencias

npm workspaces hoisita las dependencias comunes al `node_modules` raíz. Esto significa:

- Un solo `node_modules` a nivel raíz para dependencias compartidas
- Las dependencias específicas de cada workspace quedan en su propio `node_modules/`
- Turborepo usa el caché de builds para no recompilar lo que no cambió

## `turbo.json` — pipelines

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "format": { "cache": false }
  }
}
```

El `^build` significa "esperar a que las dependencias del workspace estén construidas primero". Así `packages/shared` siempre se compila antes que `backend` o `frontend`.
