import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyStore } from '@/stores/company.store';
import { Permissions } from '@/constants/permissions';
import { resolveTenantByParam, companyPathFor, tenantUrlParam } from '@/utils/tenant';
import { APP_NAME } from '@/constants/brand';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true, title: 'Iniciar sesión' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresGuest: true, title: 'Crear cuenta' },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { requiresGuest: true, title: 'Recuperar contraseña' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { requiresGuest: true, title: 'Restablecer contraseña' },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true, title: 'Crear empresa' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    // Pública a propósito: el enlace llega al correo y puede abrirse con o sin sesión
    component: () => import('@/views/VerifyEmailView.vue'),
    meta: { title: 'Verificar correo' },
  },
  {
    path: '/companies/:companyId',
    redirect: (to) => `/companies/${to.params.companyId}/dashboard`,
  },
  {
    path: '/companies/:companyId/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Panel' },
  },
  {
    path: '/companies/:companyId/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, requiredPermission: Permissions.COMPANY.READ, title: 'Configuración' },
  },
  {
    path: '/companies/:companyId/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' },
  },
  {
    path: '/companies/:companyId/change-password',
    name: 'ChangePassword',
    component: () => import('@/views/ChangePasswordView.vue'),
    meta: { requiresAuth: true, title: 'Cambiar contraseña' },
  },
  {
    path: '/companies/:companyId/members',
    name: 'Members',
    component: () => import('@/views/MembersView.vue'),
    meta: { requiresAuth: true, requiredPermission: Permissions.USERS.READ, title: 'Miembros' },
  },
  {
    path: '/companies/:companyId/branches',
    name: 'Branches',
    component: () => import('@/views/BranchesView.vue'),
    meta: { requiresAuth: true, requiredPermission: Permissions.BRANCHES.READ, title: 'Sucursales' },
  },
  {
    path: '/companies/:companyId/roles',
    name: 'Roles',
    component: () => import('@/views/RolesView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: Permissions.ROLES.READ,
      title: 'Roles',
    },
  },
  {
    path: '/companies/:companyId/audit',
    name: 'Audit',
    component: () => import('@/views/AuditView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: Permissions.AUDIT.READ,
      title: 'Auditoría',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  authStore.healActiveTenant();
  const isAuthenticated = authStore.isAuthenticated;
  const tenants = authStore.user?.tenants;
  const param = typeof to.params.companyId === 'string' ? to.params.companyId : undefined;

  // Super-admin: resuelve también contra todas las empresas (acceso virtual
  // a compañías ajenas a sus membresías). Sin esto el guard rebotaría al Panel.
  let allCompanies: { id: string; slug: string | null; name: string; tax_id: string | null; roles: string[] }[] = [];
  let companyStore: { allCompanies: typeof allCompanies; allCompaniesLoaded: boolean; fetchAllCompanies: () => Promise<unknown> } | null = null;
  try {
    const store = useCompanyStore();
    companyStore = store;
    allCompanies = store.allCompanies;
  } catch {
    allCompanies = [];
  }
  const resolveKnown = (p: string | undefined) =>
    resolveTenantByParam(tenants, p) ?? resolveTenantByParam(allCompanies, p);

  // Al recargar sobre una empresa ajena, `allCompanies` aún está vacía (se
  // carga al montar el layout, DESPUÉS del guard). Cargarla aquí una sola vez
  // evita el rebote al Panel en el refresh.
  if (param && isAuthenticated && authStore.isSuperAdmin && !resolveKnown(param)) {
    if (companyStore && !companyStore.allCompaniesLoaded) {
      try {
        await companyStore.fetchAllCompanies();
        allCompanies = companyStore.allCompanies;
      } catch {
        allCompanies = [];
      }
    }
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'Login' };
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    const tenant =
      resolveTenantByParam(tenants, authStore.activeTenantId ?? undefined) ?? tenants?.[0];
    if (tenant) {
      return { path: companyPathFor(tenant, '/dashboard') };
    }
    return { name: 'Onboarding' };
  }

  // Resuelve el tenant de la URL y canoniza el parámetro: el slug reemplaza al
  // UUID en la barra de direcciones sin romper enlaces viejos.
  if (param && isAuthenticated) {
    const tenant = resolveKnown(param);

    if (!tenant) {
      const fallback =
        resolveKnown(authStore.activeTenantId ?? undefined) ?? tenants?.[0];
      const fallbackPath = companyPathFor(fallback, '/dashboard');
      if (fallbackPath && fallbackPath !== to.path) {
        return { path: fallbackPath, query: to.query, hash: to.hash, replace: true };
      }
    } else {
      if (authStore.activeTenantId !== tenant.id) {
        authStore.setActiveTenant(tenant.id);
      }

      const canonical = tenantUrlParam(tenant);
      if (canonical && canonical !== param) {
        return {
          path: `/companies/${canonical}${to.path.replace(/^\/companies\/[^/]+/, '')}`,
          query: to.query,
          hash: to.hash,
          replace: true,
        };
      }
    }
  }

  const activeTenant =
    resolveKnown(param) ??
    resolveKnown(authStore.activeTenantId ?? undefined) ??
    tenants?.[0];

  // Users without any organization go to onboarding first.
  // Un super-admin puro (sin membresías) no está obligado: administra global.
  if (
    isAuthenticated &&
    (tenants?.length || 0) === 0 &&
    !authStore.isSuperAdmin &&
    to.name !== 'Onboarding' &&
    to.meta.requiresAuth
  ) {
    return { name: 'Onboarding' };
  }

  // Force password change — block all pages except ChangePassword
  if (isAuthenticated && authStore.user?.must_change_password && to.name !== 'ChangePassword' && to.name !== 'Onboarding') {
    const path = companyPathFor(activeTenant, '/change-password');
    if (path) return { path };
  }

  if (to.meta.requiredPermission) {
    if (!authStore.hasPermission(to.meta.requiredPermission as string)) {
      const path = companyPathFor(activeTenant, '/dashboard');
      if (path) return { path };
    }
  }
});

router.afterEach((to) => {
  const authStore = useAuthStore();
  const section = typeof to.meta.title === 'string' ? to.meta.title : undefined;
  const param = typeof to.params.companyId === 'string' ? to.params.companyId : undefined;
  let allCompaniesAfter: { id: string; slug: string | null; name: string; tax_id: string | null; roles: string[] }[] = [];
  try {
    allCompaniesAfter = useCompanyStore().allCompanies;
  } catch {
    allCompaniesAfter = [];
  }
  const tenant =
    resolveTenantByParam(authStore.user?.tenants, param) ??
    resolveTenantByParam(allCompaniesAfter, param);

  if (section && tenant?.name) {
    document.title = `${section} · ${tenant.name} · ${APP_NAME}`;
  } else if (section) {
    document.title = `${section} · ${APP_NAME}`;
  } else {
    document.title = APP_NAME;
  }
});

export default router;
