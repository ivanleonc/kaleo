# Instalación

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | `>=22 <25` | Usar nvm; `.nvmrc` incluido en el repo |
| npm | `10+` | Incluido con Node 22 |
| Git | Cualquiera reciente | — |
| Cuenta Supabase | — | Necesaria para la base de datos |

## 1. Clonar el repositorio

```bash
git clone https://github.com/anomalyco/kaleo.git
cd kaleo
```

## 2. Instalar dependencias

El proyecto usa npm workspaces con Turborepo. Instala todo desde la raíz:

```bash
# Instala dependencias de todos los workspaces
npm install --prefix backend
npm install --prefix frontend
npm install --prefix docs
```

O en un solo comando:

```bash
npm run install:all
```

## 3. Configurar variables de entorno

### Backend

```bash
cp backend/.env.example backend/.env.development
```

Edita `backend/.env.development` con tus valores. Las variables obligatorias son:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
JWT_SECRET=<string-aleatorio-largo>
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Ver la [guía completa de variables de entorno](/inicio/variables-entorno) para todas las opciones.

### Frontend

```bash
cp frontend/.env.example frontend/.env.development
```

El frontend solo necesita:

```bash
VITE_API_URL=http://localhost:3000/api
```

## 4. Configurar la base de datos

Kaleo usa **Supabase** como proveedor PostgreSQL. Necesitas crear dos proyectos:

| Proyecto | Uso | Región recomendada |
|---|---|---|
| `kaleo-dev` | Desarrollo diario | `ca-central-1` |
| `kaleo-prod` | Producción | `us-east-2` |

### Aplicar migraciones

Las migraciones son archivos SQL en `backend/src/migrations/`. Aplícalas en orden en el **SQL Editor de Supabase**:

```
000 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010
→ 011 → 012 → 013 → 014 → 015 → 016 → 017
```

::: tip
La migración `000` es re-ejecutable. Incluye el esquema completo. Puedes usarla para crear el schema desde cero en una base de datos vacía.
:::

### Verificar migraciones aplicadas

```sql
SELECT version FROM schema_migrations ORDER BY version;
```

## 5. Ejecutar en desarrollo

```bash
# Levanta backend (puerto 3000) + frontend (puerto 5173) simultáneamente
npm run dev
```

O por separado:

```bash
# Solo backend
npm run dev --prefix backend

# Solo frontend
npm run dev --prefix frontend
```

## 6. Verificar que funciona

| Servicio | URL | Descripción |
|---|---|---|
| Frontend | http://localhost:5173 | App Vue 3 |
| Backend | http://localhost:3000 | NestJS API |
| Health check | http://localhost:3000/health | Estado del servidor y BD |
| Swagger UI | http://localhost:3000/api/docs | Requiere `SWAGGER_ENABLED=true` |

## Scripts útiles

```bash
# Correr tests (backend + frontend)
npm test

# TypeCheck estricto
npm run typecheck

# Linting
npm run lint

# Build de producción
npm run build

# Documentación (este sitio)
npm run docs:dev
```

## Primer usuario

Una vez que la base de datos está lista, crea el primer usuario Owner:

```bash
npm run seed:owner --prefix backend -- development tu@email.com "Tu Nombre" "Nombre Empresa"
```

::: warning
Este script solo funciona en bases de datos vacías (sin usuarios previos). Úsalo únicamente en `development`.
:::
