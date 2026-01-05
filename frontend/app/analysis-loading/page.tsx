'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  refreshGolfSwingAnalysis,
  getGolfSwingAnalysis,
  type AnalysisStatus
} from '@/lib/golf-swing'

export default function AnalysisLoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get('memberId')
  const analysisId = searchParams.get('analysisId')

  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('분석 시작 중...')
  const [status, setStatus] = useState<AnalysisStatus>('pending')
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const steps: Record<AnalysisStatus | 'checking', string> = {
    pending: '분석 대기 중...',
    processing: 'AI 스윙 분석 중...',
    completed: '분석 완료!',
    failed: '분석 실패',
    checking: '분석 결과 확인 중...',
  }

  // 분석 상태에 따른 진행률 반환
  const getProgressFromStatus = (s: AnalysisStatus): number => {
    switch (s) {
      case 'pending': return 10
      case 'processing': return 50
      case 'completed': return 100
      case 'failed': return 0
      default: return 0
    }
  }

  // 분석 상태 폴링
  const pollAnalysisStatus = useCallback(async () => {
    if (!analysisId) {
      setError('분석 ID가 없습니다.')
      return
    }

    try {
      // 먼저 현재 분석 상태 확인
      const analysis = await getGolfSwingAnalysis(parseInt(analysisId))

      if (!analysis) {
        setError('분석 정보를 찾을 수 없습니다.')
        return
      }

      setStatus(analysis.status)
      setProgress(getProgressFromStatus(analysis.status))
      setCurrentStep(steps[analysis.status])

      // 완료된 경우 결과 페이지로 이동
      if (analysis.status === 'completed') {
        setTimeout(() => {
          router.push(`/analysis-result?memberId=${memberId}&analysisId=${analysisId}`)
        }, 1000)
        return
      }

      // 실패한 경우
      if (analysis.status === 'failed') {
        setError('분석에 실패했습니다. 다시 시도해주세요.')
        return
      }

      // processing 상태일 때 REMO API에서 결과 가져오기 시도
      if (analysis.status === 'processing') {
        setCurrentStep('분석 결과 확인 중...')
        const refreshResult = await refreshGolfSwingAnalysis(parseInt(analysisId))

        if (refreshResult) {
          if (refreshResult.status === 'completed') {
            setStatus('completed')
            setProgress(100)
            setCurrentStep(steps.completed)
            setTimeout(() => {
              router.push(`/analysis-result?memberId=${memberId}&analysisId=${analysisId}`)
            }, 1000)
            return
          } else if (refreshResult.status === 'processing') {
            // 아직 분석 중, 진행률 점진적 증가 (50-90 사이)
            const additionalProgress = Math.min(40, pollCount * 5)
            setProgress(50 + additionalProgress)
          }
        }
      }

      setPollCount(prev => prev + 1)
    } catch (err) {
      console.error('분석 상태 확인 실패:', err)
      // 네트워크 오류 등에서는 계속 재시도
    }
  }, [analysisId, memberId, router, pollCount, steps])

  useEffect(() => {
    if (!analysisId) {
      setError('분석 ID가 없습니다. 이전 페이지로 돌아가주세요.')
      return
    }

    // 초기 상태 확인
    pollAnalysisStatus()

    // 5초마다 상태 폴링 (최대 5분 = 60회)
    const pollInterval = setInterval(() => {
      if (status === 'completed' || status === 'failed' || pollCount >= 60) {
        clearInterval(pollInterval)
        if (pollCount >= 60) {
          setError('분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
        }
        return
      }
      pollAnalysisStatus()
    }, 5000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [analysisId, status, pollCount, pollAnalysisStatus])

  const handleBack = () => {
    router.push(`/member/${memberId}`)
  }

  const handleRetry = () => {
    // 다시 업로드 페이지로
    router.push(`/upload-video?memberId=${memberId}&swingType=full`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            {status === 'failed' || error ? (
              <AlertCircle className="h-10 w-10 text-destructive" />
            ) : (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {status === 'failed' || error ? '분석 실패' : '스윙 분석 중'}
            </h2>
            <p className="text-muted-foreground">
              {error || '잠시만 기다려주세요...'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {!error && (
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Current Step */}
          {!error && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground">{currentStep}</p>
              {status === 'processing' && (
                <p className="text-xs text-muted-foreground mt-2">
                  REMO AI 분석은 약 30초~2분 소요됩니다
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {(status === 'failed' || error) && (
            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                회원 상세
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                다시 시도
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
