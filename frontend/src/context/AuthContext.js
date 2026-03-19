import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get stored tokens
  const getAccessToken = () => localStorage.getItem('access_token');
  const getRefreshToken = () => localStorage.getItem('refresh_token');

  // Store tokens
  const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  };

  // Clear tokens
  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  // Create axios instance with interceptors
  const api = axios.create({
    baseURL: `${API_URL}/api`,
  });

  // Request interceptor to add token
  api.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });
            const { access_token } = response.data;
            storeTokens(access_token, null);
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          } catch (refreshError) {
            clearTokens();
            setUser(null);
            setOrganization(null);
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );

  // Fetch current user
  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setOrganization(response.data.organization);
      
      // Apply org accent color
      if (response.data.organization?.accent_color) {
        document.documentElement.style.setProperty(
          '--org-accent-color',
          response.data.organization.accent_color
        );
      }
    } catch (err) {
      clearTokens();
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login function
  const login = async (email, password, rememberMe = false) => {
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
        remember_me: rememberMe,
      });

      const { access_token, refresh_token, user: userData } = response.data;
      storeTokens(access_token, refresh_token);
      setUser(userData);
      setOrganization(userData.organization);

      // Apply org accent color
      if (userData.organization?.accent_color) {
        document.documentElement.style.setProperty(
          '--org-accent-color',
          userData.organization.accent_color
        );
      }

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore logout errors
    } finally {
      clearTokens();
      setUser(null);
      setOrganization(null);
      // Reset accent color to default
      document.documentElement.style.setProperty('--org-accent-color', '#3B82F6');
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email,
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.detail || 'Request failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    organization,
    loading,
    error,
    login,
    logout,
    forgotPassword,
    isAuthenticated: !!user,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
