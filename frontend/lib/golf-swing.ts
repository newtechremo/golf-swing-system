"use client"

import api, { extractApiError } from './api'

// 골프 스윙 분석 타입 정의
export type SwingType = 'full' | 'half'

// 스윙 단계 (REMO API 기반)
export type SwingPhase =
  | 'address'
  | 'takeback'
  | 'backswing'
  | 'backswingtop'
  | 'downswing'
  | 'impact'
  | 'follow'
  | 'finish'

// 스윙 단계 한글 레이블
export const SWING_PHASE_LABELS: Record<SwingPhase, string> = {
  address: '1. 어드레스',
  takeback: '2. 테이크백',
  backswing: '3. 백스윙',
  backswingtop: '4. 백스윙탑',
  downswing: '5. 다운스윙',
  impact: '6. 임팩트',
  follow: '7. 팔로우스루',
  finish: '8. 피니시',
}

// 분석 상태
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 단계별 분석 결과
export interface PhaseAnalysisResult {
  phase: SwingPhase
  frameNumber: number
  imageUrl?: string
  metrics: {
    kneeLine?: number
    pelvisAngle?: number
    shoulderAngle?: number
    headPosition?: number
    spineAngle?: number
    hipRotation?: number
    armPosition?: number
  }
  feedback: {
    strengths: string[]
    weaknesses: string[]
    tips: string[]
  }
}

// 골프 스윙 분석 전체 결과
export interface GolfSwingAnalysisResult {
  id: number
  subjectId: number
  status: AnalysisStatus
  swingType: SwingType
  videoUrl: string
  createdAt: string
  completedAt?: string
  memo?: string
  overallFeedback?: {
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
  phases: PhaseAnalysisResult[]
  graphData?: {
    frame: number
    kneeLine: number
    pelvis: number
    shoulderLine: number
    elements: number
  }[]
}

// 분석 시작 응답
export interface StartAnalysisResponse {
  message: string
  analysisId: number
  uuid: string
}

/**
 * 골프 스윙 비디오 업로드 및 분석 시작
 */
export async function uploadGolfSwingVideo(
  video: File,
  subjectId: number,
  swingType: SwingType,
  height?: number
): Promise<StartAnalysisResponse | null> {
  try {
    const formData = new FormData()
    formData.append('video', video)
    formData.append('subjectId', subjectId.toString())
    formData.append('swingType', swingType)
    if (height) {
      formData.append('height', height.toString())
    }

    const response = await api.post<StartAnalysisResponse>('/golf-swing/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5분 타임아웃 (최대 500MB 비디오 업로드)
    })

    return response.data
  } catch (error) {
    console.error('골프 스윙 분석 시작 실패:', extractApiError(error))
    throw error
  }
}

/**
 * 골프 스윙 분석 결과 조회
 */
export async function getGolfSwingAnalysis(
  analysisId: number
): Promise<GolfSwingAnalysisResult | null> {
  try {
    const response = await api.get<GolfSwingAnalysisResult>(`/golf-swing/analysis/${analysisId}`)
    return response.data
  } catch (error) {
    console.error('골프 스윙 분석 결과 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 골프 스윙 분석 메모 업데이트
 */
export async function updateGolfSwingMemo(
  analysisId: number,
  memo: string
): Promise<boolean> {
  try {
    await api.put(`/golf-swing/analysis/${analysisId}/memo`, { memo })
    return true
  } catch (error) {
    console.error('메모 업데이트 실패:', extractApiError(error))
    return false
  }
}

/**
 * REMO API에서 분석 결과를 새로고침 (결과 가져와서 저장)
 */
export interface RefreshAnalysisResponse {
  message: string
  status: AnalysisStatus
  resultVideoUrl?: string
}

export async function refreshGolfSwingAnalysis(
  analysisId: number
): Promise<RefreshAnalysisResponse | null> {
  try {
    const response = await api.post<RefreshAnalysisResponse>(`/golf-swing/analysis/${analysisId}/refresh`)
    return response.data
  } catch (error) {
    console.error('분석 결과 새로고침 실패:', extractApiError(error))
    return null
  }
}

/**
 * 골프 스윙 분석 삭제
 */
export async function deleteGolfSwingAnalysis(
  analysisId: number
): Promise<boolean> {
  try {
    await api.delete(`/golf-swing/analysis/${analysisId}`)
    return true
  } catch (error) {
    console.error('골프 스윙 분석 삭제 실패:', extractApiError(error))
    return false
  }
}

/**
 * 골프 스윙 분석 비디오 URL 조회
 */
export interface VideoUrlResponse {
  videoUrl: string
  resultVideoUrl?: string
}

export async function getGolfSwingVideoUrls(
  analysisId: number
): Promise<VideoUrlResponse | null> {
  try {
    const response = await api.get<VideoUrlResponse>(`/golf-swing/analysis/${analysisId}/video`)
    return response.data
  } catch (error) {
    console.error('비디오 URL 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 골프 스윙 구간별 이미지 조회
 */
export interface SwingImagesResponse {
  address: string | null
  takeback: string | null
  backswing: string | null
  backswingtop: string | null
  downswing: string | null
  impact: string | null
  follow: string | null
  finish: string | null
}

export async function getGolfSwingImages(
  analysisId: number
): Promise<SwingImagesResponse | null> {
  try {
    const response = await api.get<SwingImagesResponse>(`/golf-swing/analysis/${analysisId}/images`)
    return response.data
  } catch (error) {
    console.error('구간 이미지 조회 실패:', extractApiError(error))
    return null
  }
}

/**
 * 분석 상태 폴링 (완료될 때까지)
 */
export async function pollGolfSwingAnalysis(
  analysisId: number,
  onProgress?: (status: AnalysisStatus) => void,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<GolfSwingAnalysisResult | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getGolfSwingAnalysis(analysisId)

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
 * 스윙 타입 레이블 반환
 */
export function getSwingTypeLabel(swingType: SwingType): string {
  return swingType === 'full' ? '풀스윙' : '하프스윙'
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

/**
 * 분석 상태 색상 반환
 */
export function getAnalysisStatusColor(status: AnalysisStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-500'
    case 'processing':
      return 'text-blue-500'
    case 'completed':
      return 'text-green-500'
    case 'failed':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}
