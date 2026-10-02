import axios from 'axios';
import { TokenService } from '@/utils/token.service';

/**
 * URL base de la API. En desarrollo cae a localhost; en producción es
 * OBLIGATORIA (se hornea en el build): un build prod sin VITE_API_URL
 * fallaría en silencio contra localhost, así que se revienta temprano.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (!configuredApiUrl && import.meta.env.PROD) {
  throw new Error(
    '[api] VITE_API_URL no está configurada. Define la URL del backend y reconstruye.',
  );
}
export const API_BASE_URL = configuredApiUrl || 'http://localhost:3000/api';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Enriquece un error HTTP con banderas y mensaje en español para la UI.
 *
 * Regla para 403: si el servidor explicó el motivo (ej. "No puedes reusar
 * contraseñas"), ese mensaje específico es el que debe ver el usuario. El
 * genérico ("No tienes permiso...") solo aplica cuando el 403 viene sin
 * explicación (ej. guard de permisos).
 */
export function enrichAxiosError(error: any): void {
  const status = error.response?.status;
  if (status === 403) {
    error._isForbidden = true;
    const serverMessage = error.response?.data?.message;
    error._userMessage =
      typeof serverMessage === 'string' && serverMessage.trim()
        ? serverMessage
        : 'No tienes permiso para realizar esta acción.';
  }
  if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !navigator.onLine)) {
    error._isOffline = true;
    error._userMessage = 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = TokenService.getToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const explicitTenant = localStorage.getItem('saas_active_tenant');
      if (explicitTenant && config.headers) {
        config.headers['x-company-id'] = explicitTenant;
      } else {
        const storageData = localStorage.getItem('saas_auth_storage');
        if (storageData) {
          const parsed = JSON.parse(storageData);
          const tenantId = parsed.activeTenantId ?? parsed.state?.activeTenantId;
          if (tenantId && config.headers) {
            config.headers['x-company-id'] = String(tenantId);
          }
        }
      }
    } catch {}

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = TokenService.getRefreshToken();
      if (!currentRefreshToken) {
        isRefreshing = false;
        TokenService.destroyTokens();
        localStorage.removeItem('saas_user');
        localStorage.removeItem('saas_active_tenant');
        localStorage.removeItem('saas_auth_storage');
        if (window.location.pathname !== '/login') {
          sessionStorage.setItem('saas_session_expired', '1');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: currentRefreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        TokenService.saveTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenService.destroyTokens();
        localStorage.removeItem('saas_user');
        localStorage.removeItem('saas_active_tenant');
        localStorage.removeItem('saas_auth_storage');
        if (window.location.pathname !== '/login') {
          sessionStorage.setItem('saas_session_expired', '1');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    enrichAxiosError(error);
    return Promise.reject(error);
  }
);
