"use client"

import api, { extractApiError } from './api'

// 분석 타입
export type AnalysisType = 'golf' | 'posture' | 'all'

// 분석 이력 아이템 타입
export interface AnalysisHistoryItem {
  id: number
  type: 'golf' | 'posture'
  date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  swingType?: 'full' | 'half' // 골프만 해당
  thumbnailUrl?: string
  memo?: string
}

// 분석 이력 응답 타입
export interface AnalysisHistoryResponse {
  data: AnalysisHistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 분석 이력 조회 쿼리 타입
export interface GetHistoryQuery {
  type?: AnalysisType
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

// 캘린더 날짜별 데이터
export interface CalendarDayData {
  date: string
  golfCount: number
  postureCount: number
  analyses: {
    id: number
    type: 'golf' | 'posture'
    status: string
  }[]
}

// 캘린더 데이터 응답
export interface CalendarDataResponse {
  year: number
  month: number
  days: CalendarDayData[]
}

/**
 * 대상자 분석 이력 조회
 */
export async function getAnalysisHistory(
  subjectId: number,
  query?: GetHistoryQuery
): Promise<AnalysisHistoryResponse | null> {
  try {
    const params = new URLSearchParams()
    if (query?.type && query.type !== 'all') {
      params.append('type', query.type)
    }
    if (query?.startDate) params.append('startDate', query.startDate)
    if (query?.endDate) params.append('endDate', query.endDate)
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())

    const response = await api.get<AnalysisHistoryResponse>(
      `/history/subject/${subjectId}?${params.toString()}`
    )
    return response.data
  } catch (error) {
    console.error('분석 이력 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 대상자 캘린더 데이터 조회
 */
export async function getCalendarData(
  subjectId: number,
  year: number,
  month: number
): Promise<CalendarDataResponse | null> {
  try {
    const response = await api.get<CalendarDataResponse>(
      `/history/subject/${subjectId}/calendar?year=${year}&month=${month}`
    )
    return response.data
  } catch (error) {
    console.error('캘린더 데이터 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 분석 타입 레이블 반환
 */
export function getAnalysisTypeLabel(type: 'golf' | 'posture'): string {
  return type === 'golf' ? '골프 스윙' : '체형 분석'
}

/**
 * 날짜 포맷 함수
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 날짜 및 시간 포맷 함수
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
