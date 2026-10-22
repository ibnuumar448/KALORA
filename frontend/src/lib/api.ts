import axios from 'axios';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!configuredApiUrl && process.env.NODE_ENV !== 'development') {
  throw new Error('NEXT_PUBLIC_API_URL must be configured for this environment.');
}

let apiUrl: URL;
try {
  apiUrl = new URL(configuredApiUrl || 'http://localhost:8000/api/v1');
} catch {
  throw new Error('NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL.');
}

const isLoopbackHost =
  apiUrl.hostname === 'localhost' ||
  apiUrl.hostname.endsWith('.localhost') ||
  apiUrl.hostname === '[::1]' ||
  apiUrl.hostname.startsWith('127.');
const productionPath = apiUrl.pathname.replace(/\/+$/, '');
if (
  !['http:', 'https:'].includes(apiUrl.protocol) ||
  apiUrl.username ||
  apiUrl.password ||
  (process.env.NODE_ENV === 'production' &&
    (apiUrl.protocol !== 'https:' ||
      isLoopbackHost ||
      productionPath !== '/api/v1' ||
      apiUrl.search ||
      apiUrl.hash))
) {
  throw new Error(
    'NEXT_PUBLIC_API_URL must be an HTTPS backend API URL ending in /api/v1 without query or fragment.'
  );
}

export const API_BASE_URL = apiUrl.toString().replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Basic interceptor to handle 401s (Token refresh logic can be expanded here)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
