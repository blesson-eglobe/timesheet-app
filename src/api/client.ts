import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

import { useAppStore } from '../store/useAppStore';

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const store = useAppStore.getState();
    if (store.currentUser?.email) {
      config.headers['X-Active-Email'] = store.currentUser.email;
    }
    if (store.role) {
      config.headers['X-Active-Role'] = store.role;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// ─── Response interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      const loginUrl = (import.meta.env.BASE_URL || '/') + 'login';
      const cleanLoginUrl = loginUrl.replace('//', '/');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = cleanLoginUrl;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
