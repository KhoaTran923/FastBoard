import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

// ── Token storage ───────────────────────────────────────────────────────────
const ACCESS_KEY = 'fb_access_token';
const REFRESH_KEY = 'fb_refresh_token';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: API_URL });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401, try to refresh the access token once, then retry the request.
// A single shared promise prevents a stampede of refresh calls.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const res = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      `${API_URL}/auth/refresh`,
      { refresh_token: refresh }
    );
    const data = res.data.data;
    if (data?.access_token) {
      tokenStore.set(data.access_token, data.refresh_token ?? refresh);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && tokenStore.refresh) {
      original._retry = true;
      refreshing ??= refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      tokenStore.clear();
    }
    return Promise.reject(error);
  }
);

/** Turn any thrown API error into a user-friendly message. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined;
    if (data?.errors?.length) return data.errors.map((e) => e.message).join(' · ');
    if (data?.error) return data.error;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
    if (err.message) return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export default api;
