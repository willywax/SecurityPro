import axios from 'axios';
import { toast } from 'sonner';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

const viteApiUrl =
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : undefined;

const legacyApiUrl =
  typeof process !== 'undefined'
    ? process.env?.REACT_APP_BACKEND_URL || process.env?.VITE_API_URL
    : undefined;

const envBaseUrl = viteApiUrl || legacyApiUrl || 'http://localhost:8000';

export const API_BASE_URL = envBaseUrl.replace(/\/$/, '');

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const storeTokens = (accessToken, refreshToken) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.detail || error?.message || fallback;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearTokens();

      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    } else if (error?.response?.status >= 500) {
      toast.error(getErrorMessage(error, 'Server error'));
    }

    return Promise.reject(error);
  },
);

export default api;
