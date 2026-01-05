"use client"

import api, { setAuthToken, removeAuthToken, extractApiError } from './api'

// 사용자 타입 정의 (백엔드 UserDto와 일치)
export interface User {
  id: number
  username: string
  name: string
  phoneNumber: string
  email: string
  paymentType: 'free' | 'paid'
  isCertified: boolean
  certificationNumber?: string
  subscriptionEndDate?: Date
  status: 'active' | 'inactive' | 'suspended'
  centerId: number
  centerName?: string
}

// 로그인 응답 타입
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// 로그인 요청 타입
export interface LoginRequest {
  email: string
  password: string
}

/**
 * 로그인 API 호출
 */
export async function login(email: string, password: string): Promise<User | null> {
  try {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    })

    const { accessToken, refreshToken, user } = response.data

    // 토큰 및 사용자 정보 저장
    setAuthToken(accessToken)
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
    }

    return user
  } catch (error) {
    console.error('로그인 실패:', extractApiError(error))
    return null
  }
}

/**
 * 로그아웃
 */
export function logout(): void {
  removeAuthToken()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }
}

/**
 * 현재 로그인된 사용자 정보 가져오기
 */
export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * 토큰 갱신
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return false

    const response = await api.post<{ accessToken: string }>('/auth/refresh', null, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    setAuthToken(response.data.accessToken)
    return true
  } catch (error) {
    console.error('토큰 갱신 실패:', extractApiError(error))
    logout()
    return false
  }
}

/**
 * 비밀번호 변경 (추후 구현)
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return true
  } catch (error) {
    console.error('비밀번호 변경 실패:', extractApiError(error))
    return false
  }
}

/**
 * 로그인 상태 확인
 */
export function isLoggedIn(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('accessToken') && !!localStorage.getItem('user')
  }
  return false
}
