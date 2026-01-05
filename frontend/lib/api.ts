import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

// API 포트
const API_PORT = 3003

// 동적으로 API 기본 URL 생성 (접속한 호스트 사용)
function getApiBaseUrl(): string {
  // 서버 사이드 렌더링 시 환경변수 사용
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${API_PORT}/api`
  }

  // 클라이언트 사이드: 현재 접속한 호스트 사용
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:${API_PORT}/api`
}

// Axios 인스턴스 생성 (기본 URL은 인터셉터에서 동적으로 설정)
const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 - JWT 토큰 자동 첨부 및 동적 baseURL 설정
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 동적으로 baseURL 설정
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl()
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 - 에러 처리 및 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 로그인 API는 401 처리에서 제외 (로그인 실패 시 리다이렉트 방지)
    const isLoginRequest = originalRequest?.url?.includes('/auth/login')

    // 401 에러 시 로그아웃 처리 (로그인 요청 제외)
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true

      // 토큰 삭제 및 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// 토큰 저장 함수
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token)
  }
}

// 토큰 가져오기 함수
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken')
  }
  return null
}

// 토큰 삭제 함수
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
  }
}

// API 에러 타입
export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

// API 에러 추출 함수
export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    if (axiosError.response?.data) {
      return {
        message: axiosError.response.data.message || '요청 처리 중 오류가 발생했습니다',
        statusCode: axiosError.response.status,
        error: axiosError.response.data.error,
      }
    }
    return {
      message: axiosError.message || '네트워크 오류가 발생했습니다',
      statusCode: axiosError.response?.status || 500,
    }
  }
  return {
    message: '알 수 없는 오류가 발생했습니다',
    statusCode: 500,
  }
}

// 이미지 URL 변환 함수
// 백엔드에서 반환된 상대 경로를 API URL로 변환
export function getImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) {
    return ''
  }
  // 이미 절대 URL인 경우 그대로 반환
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  // 상대 경로를 API URL로 변환
  const baseUrl = getApiBaseUrl().replace(/\/api$/, '') // /api 제거
  return `${baseUrl}/api/body-posture/images/${relativePath}`
}

export default api
