import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // 강사 정보
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 초기화 - 로컬스토리지에서 복원
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        const storedUser = authService.getCurrentUserFromStorage();
        const hasValidToken = authService.isAuthenticated();

        if (storedUser && hasValidToken && !authService.isTokenExpired()) {
          // 유효한 토큰과 강사 정보가 있으면 복원
          setUser(storedUser);
          setIsAuthenticated(true);
        } else if (storedUser && authService.isTokenExpired()) {
          // 토큰이 만료되었으면 갱신 시도
          const refreshSuccess = await authService.autoRefreshToken();
          if (refreshSuccess) {
            setUser(storedUser);
            setIsAuthenticated(true);
          } else {
            // 갱신 실패 시 로그아웃
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 강사 로그인 (username + password)
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.login(credentials);

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      } else {
        setError(result.error.message);
      }

      return result;
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      setError(err.message);
      return { success: false, error: { message: err.message } };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const value = {
    user,  // 강사 정보
    isAuthenticated,
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
