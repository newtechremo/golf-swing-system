import api, { handleApiError, tokenManager } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/api';

class AuthService {
  // 강사 로그인 (username + password)
  async login(credentials) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const { accessToken, refreshToken, user } = response.data.data;

      // 토큰 저장
      tokenManager.setTokens(accessToken, refreshToken);

      // 강사 정보 저장
      this.saveUserToStorage(user);

      return {
        success: true,
        data: { accessToken, refreshToken, user },
      };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 토큰 갱신
  async autoRefreshToken() {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) return false;

      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH, {}, {
        headers: { Authorization: `Bearer ${refreshToken}` }
      });

      const { accessToken } = response.data.data;
      tokenManager.setTokens(accessToken);

      return true;
    } catch (error) {
      console.error('[autoRefreshToken] Failed:', error);
      return false;
    }
  }

  // 로그아웃
  logout() {
    tokenManager.clearTokens();
    localStorage.removeItem(STORAGE_KEYS.SELECTED_SUBJECT);
  }

  // 강사 정보 저장
  saveUserToStorage(user) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (error) {
      console.error('[saveUserToStorage] Error:', error);
    }
  }

  // 로컬스토리지에서 강사 정보 가져오기
  getCurrentUserFromStorage() {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('[getCurrentUserFromStorage] Error:', error);
      return null;
    }
  }

  // 인증 여부 확인
  isAuthenticated() {
    const token = tokenManager.getAccessToken();
    const user = this.getCurrentUserFromStorage();
    return !!token && !!user;
  }

  // 토큰 만료 확인
  isTokenExpired() {
    return tokenManager.isTokenExpired();
  }
}

export const authService = new AuthService();
