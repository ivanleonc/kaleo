# Checklist Pre-PR

Completar antes de abrir cualquier Pull Request, independientemente del tipo de módulo.

## Calidad técnica (automático)

```bash
# Ejecutar desde la raíz del proyecto
npm run typecheck    # 0 errores TypeScript en frontend y backend
npm test             # Todos los tests verdes
npm run lint         # 0 errores de linting
```

- [ ] `npm run typecheck` → limpio
- [ ] `npm test` → 100% verde
- [ ] `npm run lint` → sin errores

---

## Backend

### Base de datos
- [ ] Migración SQL numerada (`0XX-nombre.sql`) sin errores al aplicar
- [ ] Aplicada en `kaleo-dev` antes del PR
- [ ] Índices creados para columnas de filtro frecuente (`company_id`, `status`, `created_at`)

### Tipos y tipado
- [ ] Tipo de fila en `backend/src/common/types/db-rows.ts`
- [ ] Repository usa `rows<T>()` y `row<T>()` — sin `result[0]` raw con `any`
- [ ] DTOs con `class-validator` decorators

### Seguridad
- [ ] Cada query filtra por `company_id` — nunca cross-tenant
- [ ] `@RequirePermissions()` en todos los endpoints
- [ ] El endpoint de exportación aplica los mismos filtros que el de lista
- [ ] Sin datos sensibles en la respuesta (passwords, tokens)

### Permisos
- [ ] Permiso nuevo en `packages/shared/src/permissions.ts`
- [ ] Constante espejada en `backend/src/common/constants/permissions.ts`
- [ ] INSERT en migración de seeds (nueva migración si la anterior ya está aplicada)
- [ ] Module registrado en `app.module.ts`

---

## Frontend

### Store
- [ ] Usa `usePaginatedSetup` (si es paginado)
- [ ] Usa `useAsyncData` o `useDashboardData` (si no es paginado)
- [ ] Sin métodos create/update/delete en stores de solo lectura

### Composables
- [ ] `useTableView` para el setup de tabla (no el bloque de 14 líneas manual)
- [ ] `useFilterSync` para sincronizar filtros con el store
- [ ] `useModal` en lugar de `ref(false)` para cada modal
- [ ] `useDirtyForm` en cada formulario con `confirm-on-dirty`

### Componentes
- [ ] `UiFormModal` usa props `submit-label` y `:loading` (sin slot `#footer` si es simple)
- [ ] `UiDetailGrid` + `UiInfoRow` para listas de pares label/valor
- [ ] `UiMetricCard` en lugar de HTML custom para métricas de dashboard
- [ ] Feature component separado de la view para las celdas de dominio

### Rutas
- [ ] Lazy import: `() => import('@/views/XView.vue')`
- [ ] `meta.requiresAuth = true` (si requiere autenticación)
- [ ] `meta.requiredPermission` con el permiso correcto
- [ ] `meta.title` con el nombre de la sección

### Multi-tenant
- [ ] `watch(companyId, ...)` para resetear filtros cuando cambia la empresa
- [ ] `useAsyncData` con `{ watch: companyId }` (no `onMounted` manual + `watch` manual)

---

## Tests

### Backend
- [ ] Repository spec con DataSource stub (patrón de `branch.repository.spec.ts`)
- [ ] Al menos `findPaged` y `findById` están cubiertos

### Frontend
- [ ] Feature component spec (slots de `UiDataTable`, eventos `@edit @delete`)
- [ ] Si hay lógica compleja: spec del composable o del store

---

## Documentación

- [ ] Nuevo tipo de fila documentado en `db-rows.ts` con JSDoc si es complejo
- [ ] Composable nuevo con JSDoc explicando el "porqué" y un ejemplo de uso

---

## Antes del merge

- [ ] Rebased sobre `main` (sin merge commits)
- [ ] Sin `console.log`, `debugger`, o comentarios `TODO` sin ticket
- [ ] Sin credenciales, keys de API, ni datos reales en el código
- [ ] La migración SQL no fue modificada después de aplicarse en development
