# Permisos y Roles

Kaleo implementa un sistema RBAC (Role-Based Access Control) de dos capas: **roles del sistema** (fijos, inmutables) y **roles personalizados** (configurables por empresa).

## Roles del sistema

| Rol | Qué puede hacer | ¿Modificable? |
|---|---|---|
| **Owner** | Control total de la empresa — usuarios, roles, configuración, facturación. Bypasses todos los permisos. | ❌ No — inmutable |
| **Admin** | Casi todo, excepto eliminar usuarios y gestionar roles. | ✅ Solo sus permisos custom |
| **Viewer** | Solo lectura en todas las secciones a las que tiene acceso. | ✅ Solo sus permisos custom |

::: warning
El rol **Owner** es especial: no se pueden cambiar sus permisos y siempre tiene acceso total a su empresa. No confundir con el flag `is_super_admin`, que da acceso a **todas** las empresas.
:::

## Roles personalizados

Cada empresa puede crear roles adicionales con combinaciones específicas de permisos. Ejemplo: "Gestor de Ventas" con permisos de lectura en miembros y escritura en facturas.

Los roles personalizados se crean desde **Configuración → Roles y Permisos**.

## Formato de permisos

```
módulo:acción
```

Ejemplos: `users:read`, `branches:create`, `audit:read`, `roles:delete`.

## Módulos y acciones disponibles

| Módulo | Código | Acciones disponibles |
|---|---|---|
| Autenticación | `AUTH` | `read` |
| Usuarios / Miembros | `USERS` | `read`, `create`, `update`, `delete` |
| Roles | `ROLES` | `read`, `create`, `update`, `delete` |
| Empresa | `COMPANY` | `read`, `update` |
| Configuración | `SETTINGS` | `read`, `update` |
| Perfil | `PROFILE` | `read`, `update` |
| Dashboard | `DASHBOARD` | `read` |
| Sedes | `BRANCHES` | `read`, `create`, `update`, `delete` |
| Auditoría | `AUDIT` | `read` |
| Facturación | `BILLING` | `read`, `create`, `update`, `delete` |
| Notificaciones | `NOTIFICATIONS` | `read`, `update` |
| Integraciones | `INTEGRATIONS` | `read`, `create`, `update`, `delete` |

## Implementación en el frontend

### Directiva `v-permission`

Oculta elementos del DOM si el usuario no tiene el permiso requerido:

```vue
<!-- El botón solo aparece si el usuario tiene users:create -->
<UiButton v-permission="Permissions.USERS.CREATE" @click="openAddModal">
  Nuevo Miembro
</UiButton>
```

### Métodos del auth store

```ts
const authStore = useAuthStore()

// Verificar un permiso específico
authStore.hasPermission('users:read')         // → boolean
authStore.hasPermission(Permissions.USERS.READ) // equivalente

// Verificar rol del sistema
authStore.hasRole('Owner')
authStore.hasRole(SystemRoles.OWNER)

// Super-admin bypasses todo
authStore.isSuperAdmin // → boolean
```

::: tip
Los permisos se evalúan en el contexto de la empresa activa (`activeTenantId`). Al cambiar de empresa, los permisos se actualizan automáticamente porque el auth store guarda `companyPermissions[tenantId]`.
:::

## Implementación en el backend

### Decorador `@RequirePermissions`

```ts
@Controller('companies/branches')
export class BranchesController {
  @Get()
  @RequirePermissions(Permissions.BRANCHES.READ)
  list(@Headers('x-company-id') companyId: string) {
    return this.branchService.list(companyId)
  }

  @Post()
  @RequirePermissions(Permissions.BRANCHES.CREATE)
  create(@Body() dto: CreateBranchDto) { ... }
}
```

### `PermissionsGuard` y `RolesGuard`

- `PermissionsGuard` lee `@RequirePermissions()` y verifica el permiso contra los del usuario
- `RolesGuard` lee `@Roles(SystemRoles.OWNER)` y verifica el rol del sistema
- Ambos se aplican globalmente desde `app.module.ts`
- El rol **Owner** bypasses `PermissionsGuard` (tiene acceso implícito a todo)

### `@Public()` — endpoints sin autenticación

```ts
@Post('login')
@Public()         // Bypasses JwtAuthGuard — no requiere token
async login(@Body() dto: LoginDto) { ... }
```

## Flujo de verificación de permisos

```
Request llega con: JWT + x-company-id
         ↓
JwtAuthGuard: decodifica JWT, obtiene user.id
         ↓
CompanyAccessGuard: verifica user pertenece a company
         ↓
PermissionsGuard: lee @RequirePermissions('users:read')
                  → busca en user.companyPermissions[company_id]
                  → si no tiene el permiso: 403 Forbidden
                  → si es Owner o super-admin: permite siempre
```
