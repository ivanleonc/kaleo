# 07 — Checklist pre-PR unificado

Este checklist aplica a **cualquier tipo de módulo** (CRUD, reporte, dashboard, detalle). Completarlo antes de abrir el PR garantiza calidad consistente.

---

## Calidad técnica

```
Verificación automática (correr desde la raíz del proyecto):

[ ] npm run typecheck    → 0 errores TypeScript en frontend y backend
[ ] npm test             → todos los tests verdes (frontend + backend)
[ ] npm run lint         → 0 errores de linting
```

---

## Backend

```
Base de datos
[ ] Migración SQL numerada (0XX-nombre.sql), sin errores al aplicar
[ ] Aplicada en kaleo-dev antes del PR
[ ] Indexes creados para columnas de filtro frecuente (company_id, status, created_at)

Tipos y tipado
[ ] Tipo de fila en backend/src/common/types/db-rows.ts
[ ] Repository usa rows<T>() y row<T>() — sin result[0] raw con any
[ ] DTOs con class-validator (@IsString, @IsNumber, @IsOptional, etc.)

Seguridad
[ ] Cada query filtra por company_id (nunca cross-tenant)
[ ] @RequirePermissions() en todos los endpoints
[ ] El endpoint de exportación aplica los mismos filtros que el de lista
[ ] Sin datos sensibles en la respuesta (passwords, tokens)

Permisos
[ ] Permiso nuevo en packages/shared/permissions.ts
[ ] Constante espejada en backend/src/common/constants/permissions.ts
[ ] INSERT en la migración de seeds (o nueva migración si ya está aplicada)
[ ] Module registrado en app.module.ts
```

---

## Frontend

```
Store
[ ] Usa usePaginatedSetup (si es paginado)
[ ] Usa useAsyncData o useDashboardData (si no es paginado)
[ ] Sin métodos create/update/delete en stores de solo lectura

Composables
[ ] useTableView para el setup de tabla (no el bloque de 14 líneas manual)
[ ] useFilterSync para sincronizar filtros con el store
[ ] useModal en lugar de ref(false) para cada modal
[ ] useDirtyForm en cada formulario con confirm-on-dirty

Componentes
[ ] UiFormModal usa props submit-label y :loading (sin slot #footer si es simple)
[ ] UiDetailGrid + UiInfoRow para listas de pares label/valor
[ ] UiMetricCard en lugar de HTML custom para métricas de dashboard
[ ] Feature component separado de la view para las celdas de dominio

Rutas
[ ] Lazy import: () => import('@/views/XView.vue')
[ ] meta.requiresAuth = true (si requiere autenticación)
[ ] meta.requiredPermission con el permiso correcto
[ ] meta.title con el nombre de la sección

Multi-tenant
[ ] watch(companyId, ...) para resetear filtros cuando cambia la empresa
[ ] El store/composable recarga datos automáticamente con la empresa activa
[ ] useAsyncData con { watch: companyId } (no onMounted manual + watch manual)
```

---

## Tests

```
Backend
[ ] Repository spec con DataSource stub (patrón de branch.repository.spec.ts)
[ ] Al menos los métodos findPaged y findById están cubiertos

Frontend
[ ] Feature component spec (UiDataTable slots, eventos @edit @delete)
[ ] Si el módulo tiene lógica de negocio compleja, spec del composable o del store
[ ] Sin mocks que oculten el comportamiento real (preferir stubs de servicio)
```

---

## Documentación

```
[ ] docs/new-module.md apunta al manual correcto si es relevante
[ ] Comentarios JSDoc en composables nuevos (qué hace, cuándo usarlo, ejemplo)
[ ] README del backend actualizado si el módulo tiene particularidades de despliegue
```

---

## Antes del merge

```
[ ] Rebased sobre main (no merge commits)
[ ] Ningún console.log, debugger, o comentario TODO sin ticket
[ ] Sin credenciales, keys de API, ni datos reales en el código
[ ] La migración SQL NO ha sido modificada después de aplicarse en desarrollo
```

---

## Referencia rápida de composables

| Necesito... | Usar |
|---|---|
| Una lista paginada con sort y filtros | `usePaginatedSetup` en el store |
| Configurar la tabla en la view | `useTableView(columns, store)` |
| Sincronizar filtros con el store | `useFilterSync(filterRef, applyFn)` |
| Estado de un modal | `useModal<T>()` |
| Detectar cambios sin guardar | `useDirtyForm(() => ({ ...form }))` |
| Cargar datos no-paginados | `useAsyncData(fetcher, { watch: companyId })` |
| Múltiples fetches paralelos (dashboard) | `useDashboardData({ key: fetcher }, { watch })` |
| Loading/error para CRUD en el store | `paginated.withLoading(fn, errorMsg)` |
| Abrir un modal desde la paleta de comandos | `useCreateAction(() => openModal())` |
| Debounce de búsqueda | `useDebounceFn(fn, 350)` |
