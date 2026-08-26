import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

// API 기본 URL
//
// Vercel 이전 후 프론트(Vercel)와 백엔드(자체 서버)가 다른 호스트에 있으므로
// 상대경로가 아니라 절대 URL 을 사용한다.
//   프로덕션 : NEXT_PUBLIC_API_BASE_URL = https://api-golf.remo.re.kr/api
//   로컬개발 : 값을 비워두면 '/backend-api' → next.config.mjs 의 rewrites 로 프록시
//
// 주의: NEXT_PUBLIC_* 은 빌드 시점에 클라이언트 번들로 인라인된다.
//       Vercel 에서 값만 바꿔도 재배포하지 않으면 반영되지 않는다.
function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '/backend-api'
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
  return `${getApiBaseUrl()}/body-posture/images/${relativePath}`
}

export default api
