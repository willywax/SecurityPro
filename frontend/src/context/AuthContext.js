import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, {
  API_BASE_URL,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setUnauthorizedHandler,
  storeTokens,
  getErrorMessage,
} from '@/lib/api';
import { decodeJwt } from '@/utils/jwt';

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

  const resetAuthState = useCallback(() => {
    clearTokens();
    setUser(null);
    setOrganization(null);
    document.documentElement.style.setProperty('--org-accent-color', '#3B82F6');
  }, []);

  const applyOrgTheme = useCallback((org) => {
    if (org?.accent_color) {
      document.documentElement.style.setProperty('--org-accent-color', org.accent_color);
    }
  }, []);

  const hydrateTokenClaims = useCallback((token) => {
    const decoded = decodeJwt(token);

    if (!decoded) {
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      org_id: decoded.org_id,
    };
  }, []);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userResponse = await api.get('/auth/me');
      const claims = hydrateTokenClaims(token);
      const currentUser = {
        ...userResponse.data,
        role: userResponse.data.role || claims?.role,
        org_id: userResponse.data.org_id || claims?.org_id,
      };
      setUser(currentUser);

      try {
        const orgResponse = await api.get('/organization');
        setOrganization(orgResponse.data);
        applyOrgTheme(orgResponse.data);
      } catch {
        setOrganization(claims?.org_id ? { id: claims.org_id } : null);
      }
    } catch (err) {
      resetAuthState();
    } finally {
      setLoading(false);
    }
  }, [applyOrgTheme, hydrateTokenClaims, resetAuthState]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetAuthState();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    });

    fetchUser();
  }, [fetchUser, resetAuthState]);

  const login = async (email, password, rememberMe = false) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        remember_me: rememberMe,
      });

      const { access_token, refresh_token, user: userData } = response.data;
      storeTokens(access_token, refresh_token);
      const claims = hydrateTokenClaims(access_token);
      const nextUser = {
        ...userData,
        role: userData.role || claims?.role,
        org_id: userData.org_id || claims?.org_id,
      };

      setUser(nextUser);

      let org = null;
      try {
        const orgResponse = await api.get('/organization');
        org = orgResponse.data;
      } catch {
        org = claims?.org_id ? { id: claims.org_id } : null;
      }
      setOrganization(org);
      applyOrgTheme(org);

      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed');
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
    } finally {
      resetAuthState();
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await api.post('/auth/forgot-password', {
        email,
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = getErrorMessage(err, 'Request failed');
      setError(message);
      return { success: false, error: message };
    }
  };

  const value = useMemo(() => ({
    user,
    organization,
    loading,
    error,
    login,
    logout,
    forgotPassword,
    isAuthenticated: Boolean(getAccessToken()),
    api,
    apiBaseUrl: API_BASE_URL,
  }), [user, organization, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
