# Estructura del Frontend

## Árbol de directorios anotado

```
frontend/src/
│
├── api/
│   └── axios.ts          Instancia axios configurada:
│                         - Base URL desde VITE_API_URL
│                         - Interceptor de request: inyecta Bearer + x-company-id
│                         - Interceptor de response: maneja 401 con cola de refresh
│                         - enrichAxiosError(): agrega _isForbidden, _isOffline, _userMessage
│
├── assets/
│   └── main.css          Sistema de diseño completo en CSS custom properties
│                         698 líneas — tokens de color, espaciado, tipografía, layout
│
├── components/
│   ├── ui/               32 componentes del design system (prefijo Ui*)
│   │                     Sin lógica de dominio — reutilizables entre módulos
│   │
│   └── features/         Componentes de dominio por módulo
│       ├── audit/
│       │   └── AuditLogEntry.vue
│       ├── branches/
│       │   └── BranchTable.vue
│       ├── members/
│       │   ├── MemberTable.vue
│       │   └── MemberStatusBadge.vue
│       └── roles/
│           └── RoleCard.vue
│
├── composables/          18 composables reutilizables
│                         Ver sección Composables para documentación detallada
│
├── constants/
│   ├── brand.ts          APP_NAME, BRAND_SLUG
│   ├── permissions.ts    Re-exporta Permissions desde @saas/shared
│   └── roles.ts          Re-exporta SystemRoles desde @saas/shared
│
├── directives/
│   └── permission.ts     v-permission — oculta elementos sin el permiso dado
│
├── layouts/
│   ├── AuthenticatedLayout.vue  Layout post-login con sidebar + topbar
│   └── AuthLayout.vue           Layout de páginas públicas (login, registro)
│
├── router/
│   └── index.ts          Rutas + navigation guards (254 líneas)
│
├── services/             Una clase exportada por recurso API
│   ├── auth.service.ts
│   ├── branch.service.ts
│   ├── company.service.ts
│   ├── member.service.ts
│   ├── role.service.ts
│   ├── audit.service.ts
│   └── user.service.ts
│
├── stores/               5 stores Pinia (Setup Store style)
│   ├── auth.store.ts
│   ├── company.store.ts
│   ├── branch.store.ts
│   ├── member.store.ts
│   └── audit.store.ts
│
├── types/                Interfaces TypeScript por entidad
│   ├── auth.ts           AuthUser, Tenant, AuthResponse, TokenPair
│   ├── member.ts         Member, CreateMemberPayload, MemberCompany
│   ├── branch.ts         Branch, CreateBranchPayload, BranchesResponse
│   ├── company.ts        UpdateCompanyPayload, CompanyDetail
│   ├── audit.ts          AuditLog, AuditFilters, AuditLogResponse
│   ├── role.ts           Role, Permission, CreateRolePayload
│   ├── ui.ts             BadgeVariant
│   └── api.ts            Re-exporta tipos de @saas/shared
│
├── utils/
│   ├── error.ts          apiErrorMessage(), enrichAxiosError()
│   ├── text.ts           emptyToUndefined(), truncate()
│   ├── date.ts           formatDateTime(), formatRelativeTime(), useNowTick()
│   ├── password.ts       passwordErrorMessage() — política de contraseña
│   ├── storage-keys.ts   STORAGE_KEYS — keys de localStorage centralizados
│   └── token.ts          TokenService — get/set/clear access token
│
├── views/                15 vistas (una por ruta)
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── ForgotPasswordView.vue
│   ├── ResetPasswordView.vue
│   ├── VerifyEmailView.vue
│   ├── OnboardingView.vue
│   ├── DashboardView.vue
│   ├── MembersView.vue
│   ├── BranchesView.vue
│   ├── RolesView.vue
│   ├── AuditView.vue
│   ├── SettingsView.vue
│   ├── ProfileView.vue
│   ├── ChangePasswordView.vue
│   └── NotFoundView.vue
│
├── App.vue               Componente raíz: UiOfflineBanner + RouterView + UiToast
└── main.ts               Bootstrap Vue: Pinia, Router, Sentry (opt-in)
```

## Convenciones de nombres

| Convención | Ejemplo | Aplica a |
|---|---|---|
| `*View.vue` | `MembersView.vue` | Componentes de página (en `views/`) |
| `Ui*.vue` | `UiButton.vue` | Componentes del design system (en `ui/`) |
| `use*.ts` | `useModal.ts` | Composables |
| `*.store.ts` | `auth.store.ts` | Stores Pinia |
| `*.service.ts` | `member.service.ts` | Servicios de API |
| PascalCase | `MemberTable.vue` | Todos los componentes Vue |
| camelCase | `useCompanyPath.ts` | Composables y utilities |

## Flujo de datos en una vista típica

```
MembersView.vue
  ├── memberStore.fetchMembers()     ← onMounted
  ├── useTableView(columns, store)   ← configura la tabla TanStack
  ├── useFilterSync(filters, store)  ← conecta filtros al store
  ├── useModal()                     ← estado de los modales
  ├── useDirtyForm()                 ← detecta cambios sin guardar
  │
  ├── <MemberTable :table="memberTable" />  ← feature component
  ├── <UiFormModal>                          ← formulario crear/editar
  └── <UiConfirmDialog>                      ← confirmación de borrado
```

## Regla de importación

Las views orquestan; los componentes presentan. Nunca en sentido inverso:

```
✅ View importa → Feature Component importa → Ui Component
✅ View importa → Composable
✅ Composable usa → Store
✅ Store usa → Service

❌ Ui Component NO importa stores
❌ Feature Component NO llama apiClient directamente
❌ Store NO importa otros stores (salvo auth → company para super-admin)
```
