import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService } from '@/services/auth.service';
import { TokenService } from '@/utils/token.service';
import type { LoginPayload, RegisterPayload, AuthUser, Tenant } from '@/types/auth';
import { SystemRoles } from '@/constants/roles';
import { apiErrorMessage } from '@/utils/error';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(TokenService.getToken());
  const refreshToken = ref<string | null>(TokenService.getRefreshToken());
  const activeTenantId = ref<string | null>(null);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value);
  const currentTenant = computed(() =>
    user.value?.tenants?.find((t) => t.id === activeTenantId.value)
  );

  const setSession = (access: string, refresh: string, userData: AuthUser) => {
    accessToken.value = access;
    refreshToken.value = refresh;
    user.value = userData;
    TokenService.saveTokens(access, refresh);

    // Re-anclar SIEMPRE al primer tenant de este usuario. Antes solo se hacía si
    // `activeTenantId` era null, así que podía sobrevivir el tenant persistido
    // de una sesión anterior y mandarse como x-company-id en el login nuevo.
    const firstTenant = userData?.tenants?.[0];
    if (firstTenant) {
      setActiveTenant(firstTenant.id);
    } else {
      activeTenantId.value = null;
      try {
        localStorage.removeItem('saas_active_tenant');
      } catch {}
    }
  };

  const setActiveTenant = (tenantId: string) => {
    if (import.meta.env.DEV) {
      console.log('[tenant] setActiveTenant', { from: activeTenantId.value, to: tenantId });
    }
    activeTenantId.value = tenantId;
    try {
      localStorage.setItem('saas_active_tenant', tenantId);
    } catch {}
  };

  const healActiveTenant = (): void => {
    if (activeTenantId.value) return;
    try {
      const stored = localStorage.getItem('saas_active_tenant');
      if (import.meta.env.DEV) {
        console.log('[tenant] healActiveTenant', { stored });
      }
      if (stored) activeTenantId.value = stored;
    } catch {}
  };

  const hasPermission = (permission: string): boolean => {
    if (!user.value) return false;
    const activeId = activeTenantId.value;
    // Roles del tenant activo (para Owner bypass)
    const activeRoles = activeId
      ? (user.value.companyRoles?.[activeId] ?? user.value.roles ?? [])
      : (user.value.roles ?? []);
    if (activeRoles.includes(SystemRoles.OWNER)) return true;
    // Permisos del tenant activo (no del primero del JWT)
    const activePerms = activeId
      ? (user.value.companyPermissions?.[activeId] ?? user.value.permissions ?? [])
      : (user.value.permissions ?? []);
    return activePerms.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user.value) return false;
    const activeId = activeTenantId.value;
    const activeRoles = activeId
      ? (user.value.companyRoles?.[activeId] ?? user.value.roles ?? [])
      : (user.value.roles ?? []);
    return activeRoles.includes(role);
  };

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authService.login(payload);
      const { accessToken: access, refreshToken: refresh, user: userData } = response.data;
      setSession(access, refresh, userData);
    } catch (err: unknown) {
      error.value = apiErrorMessage(err, 'Error al iniciar sesión');
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (payload: RegisterPayload) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authService.register(payload);
      const { accessToken: access, refreshToken: refresh, user: userData } = response.data;
      setSession(access, refresh, userData);
    } catch (err: unknown) {
      error.value = apiErrorMessage(err, 'Error al registrar usuario');
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    if (!refreshToken.value) return false;
    try {
      const response = await authService.refresh(refreshToken.value);
      const { accessToken: access, refreshToken: refresh } = response.data;
      accessToken.value = access;
      refreshToken.value = refresh;
      TokenService.saveTokens(access, refresh);
      return true;
    } catch {
      logout();
      return false;
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await authService.getProfile();
      user.value = response.data;

      const tenants = response.data?.tenants ?? [];
      const current = activeTenantId.value;
      const stillValid = !!current && tenants.some((t) => t.id === current);
      if (!stillValid) {
        const firstTenant = tenants[0];
        if (firstTenant) {
          setActiveTenant(firstTenant.id);
        } else {
          activeTenantId.value = null;
          try {
            localStorage.removeItem('saas_active_tenant');
          } catch {}
        }
      }
    } catch {
      // Silently fail — the interceptor will handle 401
    }
  };

  /** Aplica un patch a un tenant del usuario (p.ej. tras editar la empresa). */
  const updateTenant = (tenantId: string, patch: Partial<Tenant>) => {
    const tenant = user.value?.tenants?.find((t) => t.id === tenantId);
    if (tenant) Object.assign(tenant, patch);
  };

  const logout = async () => {
    try {
      if (refreshToken.value) {
        await authService.logout(refreshToken.value);
      }
    } catch {}
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    activeTenantId.value = null;
    TokenService.destroyTokens();
    localStorage.removeItem('saas_user');
    localStorage.removeItem('saas_active_tenant');
  };

  const updateProfileData = (updatedUserData: {
    name?: string;
    email?: string;
    phone?: string | null;
    avatar_url?: string | null;
    position?: string | null;
    document_type?: string | null;
    document_number?: string | null;
    timezone?: string | null;
    locale?: string | null;
    pending_email?: string | null;
  }) => {
    if (user.value) {
      Object.assign(user.value, updatedUserData);
    }
  };

  return {
    user,
    accessToken,
    refreshToken,
    activeTenantId,
    isLoading,
    error,
    isAuthenticated,
    currentTenant,
    login,
    logout,
    register,
    refreshTokens,
    fetchProfile,
    setActiveTenant,
    healActiveTenant,
    updateProfileData,
    updateTenant,
    hasPermission,
    hasRole,
  };
}, {
  // `persist` lo provee pinia-plugin-persistedstate en runtime.
  // Se castea a any porque pinia v3 + plugin v4 no exponen el tipo
  // en DefineSetupStoreOptions y rompía `vue-tsc --build`.
  // TODO: migrar a pinia-plugin-persistedstate v5 (compatible con pinia v3)
  // y retirar este cast.
  persist: {
    key: 'saas_auth_storage',
    pick: ['user', 'activeTenantId', 'refreshToken'],
  },
} as any);
