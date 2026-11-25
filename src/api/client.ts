import axios, { InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

declare module 'axios' {
  interface AxiosRequestConfig {
    silentAuth?: boolean;
  }
  interface InternalAxiosRequestConfig {
    silentAuth?: boolean;
  }
}

interface SilentAuthRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000',
});

const REFRESH_URL = '/api/accounts/token/refresh/';

function clearSession() {
  Cookies.remove('idb_auth_token');
  Cookies.remove('idb_refresh_token');
  Cookies.remove('idb_user_data');
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

let refreshPromise: Promise<string> | null = null;

// Renova o access token usando o refresh token persistido. Todas as respostas
// 401 simultâneas compartilham a mesma promessa (single-flight), evitando
// múltiplas chamadas de refresh/races ao atualizar o cookie.
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${apiClient.defaults.baseURL}${REFRESH_URL}`,
        { refresh: Cookies.get('idb_refresh_token') },
        { timeout: 15000 }
      )
      .then((r) => {
        const access: string | undefined = r.data?.access;
        if (!access) throw new Error('refresh sem access token');
        Cookies.set('idb_auth_token', access, { expires: 7, sameSite: 'lax' });
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('idb_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as SilentAuthRequestConfig | undefined;
    const url: string = config?.url ?? '';
    const silent = !!config?.silentAuth;

    if (url.includes('/login/')) {
      return Promise.reject(error);
    }
    if (url.includes(REFRESH_URL)) {
      clearSession();
      if (!silent) redirectToLogin();
      return Promise.reject(error);
    }

    const refreshToken = Cookies.get('idb_refresh_token');
    if (!config || config._retry || !refreshToken) {
      clearSession();
      if (!silent) redirectToLogin();
      return Promise.reject(error);
    }

    try {
      await refreshAccessToken();
      config._retry = true;
      return apiClient.request(config);
    } catch (e) {
      clearSession();
      if (!silent) redirectToLogin();
      return Promise.reject(e);
    }
  }
);

export default apiClient;