"use client"

import api, { extractApiError } from './api'

// 회원(대상자) 타입 정의
export interface Subject {
  id: number
  userId: number
  phoneNumber: string
  name: string
  birthDate?: string
  gender?: 'M' | 'F' | 'Other'
  height?: number
  weight?: number
  email?: string
  memo?: string
  status: 'active' | 'inactive' | 'deleted'
  createdAt: string
  updatedAt?: string
}

// 회원 목록 아이템 타입
export interface SubjectListItem {
  id: number
  phoneNumber: string
  name: string
  birthDate?: string
  gender?: 'M' | 'F' | 'Other'
  height?: number
  weight?: number
  memo?: string
  status: 'active' | 'inactive' | 'deleted'
  createdAt: string
  analysisCount: {
    golfSwing: number
    posture: number
  }
}

// 회원 상세 정보 타입 (최근 분석 이력 포함)
export interface SubjectDetail extends Subject {
  recentAnalyses: {
    golfSwing: Array<{
      id: number
      date: string
      swingType: 'full' | 'half'
      status: string
      memo: string | null
    }>
    posture: Array<{
      id: number
      date: string
      status: string
      memo: string | null
    }>
  }
}

// 회원 생성 요청 타입
export interface CreateSubjectRequest {
  phoneNumber: string
  name: string
  birthDate?: string
  gender?: 'M' | 'F' | 'Other'
  height?: number
  weight?: number
  email?: string
  memo?: string
}

// 회원 수정 요청 타입
export interface UpdateSubjectRequest {
  phoneNumber?: string
  name?: string
  birthDate?: string
  gender?: 'M' | 'F' | 'Other'
  height?: number
  weight?: number
  email?: string
  memo?: string
  status?: 'active' | 'inactive'
}

// 회원 목록 조회 쿼리 타입
export interface GetSubjectsQuery {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'deleted'
}

// 페이지네이션 응답 타입
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 백엔드 API 응답 타입 (subjects 키 사용)
interface SubjectsApiResponse {
  subjects: SubjectListItem[]
  total: number
  page: number
  limit: number
}

/**
 * 회원 목록 조회
 */
export async function getSubjects(
  query?: GetSubjectsQuery
): Promise<PaginatedResponse<SubjectListItem> | null> {
  try {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.search) params.append('search', query.search)
    if (query?.status) params.append('status', query.status)

    const response = await api.get<SubjectsApiResponse>(
      `/subjects?${params.toString()}`
    )

    // 백엔드 응답(subjects)을 프론트엔드 형식(data)으로 변환
    const { subjects, total, page, limit } = response.data
    return {
      data: subjects || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('회원 목록 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 회원 상세 조회
 */
export async function getSubjectDetail(subjectId: number): Promise<SubjectDetail | null> {
  try {
    const response = await api.get<SubjectDetail>(`/subjects/${subjectId}`)
    return response.data
  } catch (error) {
    const apiError = extractApiError(error)
    console.error('회원 상세 조회 실패:', apiError.message, '(statusCode:', apiError.statusCode, ')')
    return null
  }
}

/**
 * 회원 등록
 */
export async function createSubject(data: CreateSubjectRequest): Promise<Subject | null> {
  try {
    const response = await api.post<Subject>('/subjects', data)
    return response.data
  } catch (error) {
    console.error('회원 등록 실패:', extractApiError(error))
    throw error
  }
}

/**
 * 회원 정보 수정
 */
export async function updateSubject(
  subjectId: number,
  data: UpdateSubjectRequest
): Promise<Subject | null> {
  try {
    const response = await api.put<Subject>(`/subjects/${subjectId}`, data)
    return response.data
  } catch (error) {
    console.error('회원 수정 실패:', extractApiError(error))
    throw error
  }
}

/**
 * 회원 삭제
 */
export async function deleteSubject(subjectId: number): Promise<boolean> {
  try {
    await api.delete(`/subjects/${subjectId}`)
    return true
  } catch (error) {
    console.error('회원 삭제 실패:', extractApiError(error))
    return false
  }
}

/**
 * 성별 표시 문자열 변환
 */
export function getGenderLabel(gender?: 'M' | 'F' | 'Other'): string {
  switch (gender) {
    case 'M':
      return '남성'
    case 'F':
      return '여성'
    case 'Other':
      return '기타'
    default:
      return '-'
  }
}

/**
 * 나이 계산
 */
export function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * 전화번호 포맷 검증
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phoneNumber)
}

/**
 * 전화번호 자동 포맷
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}
