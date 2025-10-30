import axios from 'axios';
import { STORAGE_KEYS, API_ENDPOINTS } from '../constants/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token Manager
export const tokenManager = {
  getAccessToken: () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  },
  clearTokens: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },
  isTokenExpired: () => {
    const token = tokenManager.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  },
};

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 갱신 처리
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 오류이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // 토큰 갱신 요청
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${API_ENDPOINTS.AUTH.REFRESH}`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` }
          }
        );

        const { accessToken } = response.data.data;
        tokenManager.setTokens(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // 리프레시 실패 시 로그아웃
        console.error('[Token Refresh Failed]', refreshError);
        tokenManager.clearTokens();
        window.location.href = '/instructor-select';
        return Promise.reject(refreshError);
      }
    }

    console.error('[API Response Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 에러 핸들링 헬퍼
export const handleApiError = (error) => {
  if (error.response) {
    // 서버가 응답한 에러
    return {
      message: error.response.data?.error?.message || '서버 오류가 발생했습니다.',
      code: error.response.data?.error?.code,
      status: error.response.status,
    };
  } else if (error.request) {
    // 요청은 보냈지만 응답이 없음
    return {
      message: '서버와의 통신에 실패했습니다. 네트워크 연결을 확인해주세요.',
      code: 'NETWORK_ERROR',
    };
  } else {
    // 요청 설정 중 에러
    return {
      message: error.message || '알 수 없는 오류가 발생했습니다.',
      code: 'UNKNOWN_ERROR',
    };
  }
};

export default api;
