import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService } from '@/services/auth.service';
import { TokenService } from '@/utils/token.service';
import type { LoginPayload, RegisterPayload, AuthUser } from '@/types/auth';
import { SystemRoles } from '@/constants/roles';

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

    if (userData?.tenants?.length > 0 && !activeTenantId.value) {
      const firstTenant = userData.tenants[0];
      if (firstTenant) {
        activeTenantId.value = firstTenant.id;
      }
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
    if (user.value.roles?.includes(SystemRoles.OWNER)) return true;
    return user.value.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user.value) return false;
    return user.value.roles?.includes(role) || false;
  };

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await authService.login(payload);
      const { accessToken: access, refreshToken: refresh, user: userData } = response.data;
      setSession(access, refresh, userData);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error al iniciar sesión';
      error.value = msg;
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
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error al registrar usuario';
      error.value = msg;
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
      if (response.data?.tenants?.length > 0 && !activeTenantId.value) {
        const firstTenant = response.data.tenants[0];
        if (firstTenant) {
          activeTenantId.value = firstTenant.id;
        }
      }
    } catch {
      // Silently fail — the interceptor will handle 401
    }
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
