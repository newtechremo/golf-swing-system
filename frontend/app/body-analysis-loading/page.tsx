"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Target } from "lucide-react"
import { getBodyPostureAnalysis } from "@/lib/body-posture"

export default function BodyAnalysisLoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const analysisId = searchParams.get("analysisId")
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>("pending")
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // analysisId가 없으면 이전 페이지로 이동
    if (!analysisId) {
      router.push(`/body-analysis?memberId=${memberId}`)
      return
    }

    // 진행률 애니메이션 (REMO API 대기 시간 고려해서 느리게)
    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95 // 최대 95%까지만 (완료 시 100%)
        return prev + 1
      })
    }, 500) // 0.5초마다 1% 증가 (최대 ~50초)

    // API 폴링
    const pollForResults = async () => {
      try {
        const result = await getBodyPostureAnalysis(parseInt(analysisId))

        if (!result) {
          console.log('분석 결과 조회 실패')
          return
        }

        setStatus(result.status)
        console.log('분석 상태:', result.status)

        if (result.status === 'completed') {
          setProgress(100)
          if (progressRef.current) clearInterval(progressRef.current)
          if (pollingRef.current) clearInterval(pollingRef.current)

          setTimeout(() => {
            router.push(`/body-analysis-result?memberId=${memberId}&analysisId=${analysisId}`)
          }, 500)
        } else if (result.status === 'failed') {
          if (progressRef.current) clearInterval(progressRef.current)
          if (pollingRef.current) clearInterval(pollingRef.current)
          alert('분석에 실패했습니다. 다시 시도해주세요.')
          router.push(`/body-analysis?memberId=${memberId}`)
        }
      } catch (error) {
        console.error('폴링 오류:', error)
      }
    }

    // 즉시 한 번 실행하고, 5초마다 폴링
    pollForResults()
    pollingRef.current = setInterval(pollForResults, 5000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [router, memberId, analysisId])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary animate-pulse">
              <Target className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">체형 분석 중...</h1>
            <p className="text-muted-foreground">AI가 당신의 체형을 분석하고 있습니다</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-medium text-foreground">{progress}%</p>
          </div>

          {/* Analysis Steps */}
          <div className="space-y-3 text-left">
            <div
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                progress > 20 ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${progress > 20 ? "bg-primary" : "bg-muted-foreground"}`} />
              <span className={`text-sm ${progress > 20 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                사진 데이터 처리 중
              </span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                progress > 50 ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${progress > 50 ? "bg-primary" : "bg-muted-foreground"}`} />
              <span className={`text-sm ${progress > 50 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                체형 골격 분석 중
              </span>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                progress > 80 ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${progress > 80 ? "bg-primary" : "bg-muted-foreground"}`} />
              <span className={`text-sm ${progress > 80 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                불균형 패턴 감지 중
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
