"use client"

import api, { extractApiError } from './api'

// 체형 분석 타입 정의
export type PostureViewType = 'front' | 'side' | 'back'

// 분석 상태
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Grade 타입 (REMO API 기반)
// 대부분의 지표: -2 ~ 2 (좌측심각, 좌측경미, 정상, 우측경미, 우측심각)
// turtle_neck, round_shoulder: 0, 1, 2 (정상, 주의, 심각)
export type GradeValue = -2 | -1 | 0 | 1 | 2

// 상태 레이블 및 색상
export interface GradeInfo {
  label: string
  color: string
  bgColor: string
}

// Grade별 상태 정보
export const GRADE_INFO: Record<number, GradeInfo> = {
  [-2]: { label: '좌측 심각', color: '#ef4444', bgColor: '#fee2e2' },
  [-1]: { label: '좌측 경미', color: '#f59e0b', bgColor: '#fef3c7' },
  0: { label: '정상', color: '#22c55e', bgColor: '#dcfce7' },
  1: { label: '우측 경미', color: '#f59e0b', bgColor: '#fef3c7' },
  2: { label: '우측 심각', color: '#ef4444', bgColor: '#fee2e2' },
}

// 거북목/라운드숄더 등급
export const POSTURE_GRADE_INFO: Record<number, GradeInfo> = {
  0: { label: '정상', color: '#22c55e', bgColor: '#dcfce7' },
  1: { label: '주의', color: '#f59e0b', bgColor: '#fef3c7' },
  2: { label: '심각', color: '#ef4444', bgColor: '#fee2e2' },
}

// 정면 분석 항목
export interface FrontAnalysisMetrics {
  bodyTilt: { value: number; grade: GradeValue } // 전신 좌우 기울기
  headTilt: { value: number; grade: GradeValue } // 머리 좌우 기울기
  shoulderTilt: { value: number; grade: GradeValue } // 어깨 좌우 높이
  pelvisTilt: { value: number; grade: GradeValue } // 골반 좌우 기울기
  kneeTilt: { value: number; grade: GradeValue } // 무릎 기울기
  leftLegOX: { value: number; grade: GradeValue } // O/X 다리-왼다리
  rightLegOX: { value: number; grade: GradeValue } // O/X 다리-오른다리
}

// 측면 분석 항목
export interface SideAnalysisMetrics {
  turtleNeck: { value: number; grade: 0 | 1 | 2 } // 거북목 검사
  roundShoulder: { value: number; grade: 0 | 1 | 2 } // 라운드 숄더
  bodyTilt: { value: number; grade: GradeValue } // 전신 앞뒤 기울기
  headTilt: { value: number; grade: GradeValue } // 머리 앞뒤 기울기
}

// 후면 분석 항목
export interface BackAnalysisMetrics {
  bodyTilt: { value: number; grade: GradeValue } // 전신 좌우 기울기
  headTilt: { value: number; grade: GradeValue } // 머리 좌우 기울기
  shoulderTilt: { value: number; grade: GradeValue } // 어깨 좌우 높이
  pelvisTilt: { value: number; grade: GradeValue } // 골반 좌우 기울기
  kneeTilt: { value: number; grade: GradeValue } // 무릎 기울기
}

// 뷰별 분석 결과
export interface PostureViewResult {
  viewType: PostureViewType
  imageUrl: string
  processedImageUrl?: string // 스켈레톤 오버레이 이미지
  metrics: FrontAnalysisMetrics | SideAnalysisMetrics | BackAnalysisMetrics
}

// 체형 분석 전체 결과
export interface BodyPostureAnalysisResult {
  id: number
  subjectId: number
  status: AnalysisStatus
  createdAt: string
  completedAt?: string
  memo?: string
  views: PostureViewResult[]
  overallFeedback?: {
    summary: string
    recommendations: string[]
    exerciseTips: string[]
  }
}

// 분석 시작 응답
export interface StartPostureAnalysisResponse {
  message: string
  analysisId: number
  uuids: {
    front: string
    side: string
    back: string
  }
}

// 이미지 업로드 타입 (모든 이미지는 optional)
export interface PostureImages {
  front?: File
  leftSide?: File
  rightSide?: File
  back?: File
}

/**
 * 체형 이미지 업로드 및 분석 시작
 * 업로드된 이미지만 전송 (1개 이상 필요)
 */
export async function uploadBodyPostureImages(
  images: PostureImages,
  subjectId: number
): Promise<StartPostureAnalysisResponse | null> {
  try {
    const formData = new FormData()

    // 업로드된 이미지만 FormData에 추가
    if (images.front) formData.append('front', images.front)
    if (images.leftSide) formData.append('leftSide', images.leftSide)
    if (images.rightSide) formData.append('rightSide', images.rightSide)
    if (images.back) formData.append('back', images.back)
    formData.append('subjectId', subjectId.toString())

    const response = await api.post<StartPostureAnalysisResponse>(
      '/body-posture/analyze',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2분 타임아웃 (4개 이미지 분석 시간)
      }
    )

    return response.data
  } catch (error) {
    console.error('체형 분석 시작 실패:', extractApiError(error))
    throw error
  }
}

/**
 * 체형 분석 결과 조회
 */
export async function getBodyPostureAnalysis(
  analysisId: number
): Promise<BodyPostureAnalysisResult | null> {
  try {
    const response = await api.get<BodyPostureAnalysisResult>(
      `/body-posture/analysis/${analysisId}`
    )
    return response.data
  } catch (error) {
    console.error('체형 분석 결과 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 체형 분석 메모 업데이트
 */
export async function updateBodyPostureMemo(
  analysisId: number,
  memo: string
): Promise<boolean> {
  try {
    await api.put(`/body-posture/analysis/${analysisId}/memo`, { memo })
    return true
  } catch (error) {
    console.error('메모 업데이트 실패:', extractApiError(error))
    return false
  }
}

/**
 * 체형 분석 삭제
 */
export async function deleteBodyPostureAnalysis(
  analysisId: number
): Promise<boolean> {
  try {
    await api.delete(`/body-posture/analysis/${analysisId}`)
    return true
  } catch (error) {
    console.error('체형 분석 삭제 실패:', extractApiError(error))
    return false
  }
}

/**
 * 분석 상태 폴링 (완료될 때까지)
 */
export async function pollBodyPostureAnalysis(
  analysisId: number,
  onProgress?: (status: AnalysisStatus) => void,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<BodyPostureAnalysisResult | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getBodyPostureAnalysis(analysisId)

    if (!result) {
      return null
    }

    if (onProgress) {
      onProgress(result.status)
    }

    if (result.status === 'completed' || result.status === 'failed') {
      return result
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return null
}

/**
 * Grade 값에 해당하는 정보 반환 (좌우 기울기 등)
 */
export function getGradeInfo(grade: GradeValue): GradeInfo {
  return GRADE_INFO[grade] || GRADE_INFO[0]
}

/**
 * 자세 등급 정보 반환 (거북목, 라운드숄더)
 */
export function getPostureGradeInfo(grade: 0 | 1 | 2): GradeInfo {
  return POSTURE_GRADE_INFO[grade] || POSTURE_GRADE_INFO[0]
}

/**
 * 뷰 타입 한글 레이블
 */
export function getViewTypeLabel(viewType: PostureViewType): string {
  switch (viewType) {
    case 'front':
      return '정면'
    case 'side':
      return '측면'
    case 'back':
      return '후면'
    default:
      return viewType
  }
}

/**
 * 분석 항목 한글 레이블
 */
export const METRIC_LABELS = {
  // 정면/후면 공통
  bodyTilt: '전신 기울기',
  headTilt: '머리 기울기',
  shoulderTilt: '어깨 높이 차이',
  pelvisTilt: '골반 기울기',
  kneeTilt: '무릎 기울기',
  leftLegOX: 'O/X 다리 (왼쪽)',
  rightLegOX: 'O/X 다리 (오른쪽)',
  // 측면
  turtleNeck: '거북목',
  roundShoulder: '라운드 숄더',
}

/**
 * 분석 상태 레이블 반환
 */
export function getAnalysisStatusLabel(status: AnalysisStatus): string {
  switch (status) {
    case 'pending':
      return '대기 중'
    case 'processing':
      return '분석 중'
    case 'completed':
      return '완료'
    case 'failed':
      return '실패'
    default:
      return '알 수 없음'
  }
}
