"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Share2, ThumbsUp, ThumbsDown, X, Plus, User, Calendar, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"
import {
  getGolfSwingAnalysis,
  refreshGolfSwingAnalysis,
  updateGolfSwingMemo,
  type GolfSwingAnalysisResult,
  type AnalysisStatus,
  getAnalysisStatusLabel,
  SWING_PHASE_LABELS,
  type SwingPhase
} from "@/lib/golf-swing"
import {
  classifyAnalysisResults,
  getCommentByFieldName,
  ITEM_LABELS,
  getScoreStatus,
  type AnalysisFeedback
} from "@/lib/golf-swing-comments"

// 숫자 또는 문자열을 소수점 1자리로 포맷하는 헬퍼 함수
function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return num.toFixed(1)
}

// MetricIndicator 컴포넌트 - Bad/Good 슬라이더
const MetricIndicator = ({
  value,
  min = 0,
  max = 100,
  label,
  ment,
  mentText,
}: {
  value: number | string | null | undefined
  min?: number
  max?: number
  label: string
  ment?: 1 | 2 | 3 | null
  mentText?: string
}) => {
  // 값을 숫자로 변환
  const numValue = value === null || value === undefined ? null :
    typeof value === 'string' ? parseFloat(value) : value

  if (numValue === null || isNaN(numValue)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    )
  }

  const percentage = ((numValue - min) / (max - min)) * 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  // ment 값에 따른 색상 결정
  const getMentColor = () => {
    if (ment === 1) return 'text-blue-500'
    if (ment === 2 || ment === 3) return 'text-orange-500'
    return 'text-muted-foreground'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">측정 결과 {numValue.toFixed(1)}°</span>
      </div>
      <div className="relative pt-6 pb-2">
        {/* Slider Track */}
        <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-red-500 to-blue-500">
          {/* Bad/Good Labels */}
          <div className="absolute -top-5 left-0 text-xs font-medium text-red-500">Bad</div>
          <div className="absolute -top-5 right-0 text-xs font-medium text-blue-500">Good</div>

          {/* Map Pin Thumb */}
          <div
            className="absolute -top-4 -translate-x-1/2 transition-all duration-200 hover:scale-105"
            style={{ left: `${clampedPercentage}%` }}
          >
            <svg
              width="24"
              height="32"
              viewBox="0 0 24 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              {/* Map Pin Shape */}
              <path
                d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z"
                fill={ment === 1 ? "#3B82F6" : "#FF3B30"}
              />
              {/* Inner Circle */}
              <circle cx="12" cy="8" r="3" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
        </div>
      </div>
      {/* Comment */}
      {mentText && (
        <p className={`text-sm bg-muted/50 p-3 rounded-lg ${getMentColor()}`}>
          {mentText}
        </p>
      )}
    </div>
  )
}

// 자세 단계별 분석 항목 매핑
const PHASE_FIELDS = {
  address: [
    { key: 'addressShoulderTilt', scoreKey: 'addressShoulderTiltScore', mentKey: 'addressShoulderTiltMent', label: '어깨 기울기', min: 0, max: 30 },
    { key: 'addressStance', scoreKey: 'addressStanceScore', mentKey: 'addressStanceMent', label: '스탠스', min: 0, max: 2 },
    { key: 'addressUpperBodyTilt', scoreKey: 'addressUpperBodyTiltScore', mentKey: 'addressUpperBodyTiltMent', label: '상체 기울임', min: 0, max: 45 },
  ],
  takeback: [
    { key: 'takebackLeftShoulderRotation', scoreKey: 'takebackLeftShoulderRotationScore', mentKey: 'takebackLeftShoulderRotationMent', label: '왼쪽 어깨 회전', min: 0, max: 60 },
    { key: 'takebackRightHipRotation', scoreKey: 'takebackRightHipRotationScore', mentKey: 'takebackRightHipRotationMent', label: '오른쪽 골반 회전', min: 0, max: 30 },
    { key: 'takebackLeftArmFlexion', scoreKey: 'takebackLeftArmFlexionScore', mentKey: 'takebackLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 120, max: 180 },
    { key: 'takebackRightArmFlexion', scoreKey: 'takebackRightArmFlexionScore', mentKey: 'takebackRightArmFlexionMent', label: '오른팔 펴짐 각도', min: 120, max: 180 },
  ],
  backswing: [
    { key: 'backswingLeftShoulderRotation', scoreKey: 'backswingLeftShoulderRotationScore', mentKey: 'backswingLeftShoulderRotationMent', label: '왼쪽 어깨 회전', min: 0, max: 60 },
    { key: 'backswingHeadLocation', scoreKey: 'backswingHeadLocationScore', mentKey: 'backswingHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'backswingLeftArmFlexion', scoreKey: 'backswingLeftArmFlexionScore', mentKey: 'backswingLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 90, max: 180 },
  ],
  backswingtop: [
    { key: 'backswingTopReverseSpine', scoreKey: 'backswingTopReverseSpineScore', mentKey: 'backswingTopReverseSpineMent', label: '리버스 스파인', min: -30, max: 30 },
    { key: 'backswingTopRightLegFlexion', scoreKey: 'backswingTopRightLegFlexionScore', mentKey: 'backswingTopRightLegFlexionMent', label: '오른 다리 펴짐 각도', min: 0, max: 60 },
    { key: 'backswingTopHeadLocation', scoreKey: 'backswingTopHeadLocationScore', mentKey: 'backswingTopHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'backswingTopRightHipRotation', scoreKey: 'backswingTopRightHipRotationScore', mentKey: 'backswingTopRightHipRotationMent', label: '오른쪽 골반 회전', min: 0, max: 45 },
    { key: 'backswingTopCenterOfGravity', scoreKey: 'backswingTopCenterOfGravityScore', mentKey: 'backswingTopCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
  downswing: [
    { key: 'downswingCenterOfGravity', scoreKey: 'downswingCenterOfGravityScore', mentKey: 'downswingCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
    { key: 'downswingRightElbowLocation', scoreKey: 'downswingRightElbowLocationScore', mentKey: 'downswingRightElbowLocationMent', label: '오른쪽 팔꿈치 위치', min: 0, max: 50 },
    { key: 'downswingRightArmRotation', scoreKey: 'downswingRightArmRotationScore', mentKey: 'downswingRightArmRotationMent', label: '오른팔 회전', min: 0, max: 45 },
  ],
  impact: [
    { key: 'impactHangingBack', scoreKey: 'impactHangingBackScore', mentKey: 'impactHangingBackMent', label: '체중 이동 (행잉백)', min: 0, max: 100 },
    { key: 'impactHeadLocation', scoreKey: 'impactHeadLocationScore', mentKey: 'impactHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'impactLeftArmFlexion', scoreKey: 'impactLeftArmFlexionScore', mentKey: 'impactLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 120, max: 180 },
    { key: 'impactRightArmFlexion', scoreKey: 'impactRightArmFlexionScore', mentKey: 'impactRightArmFlexionMent', label: '오른팔 펴짐 각도', min: 120, max: 180 },
  ],
  follow: [
    { key: 'followLeftLineAlign', scoreKey: 'followLeftLineAlignScore', mentKey: 'followLeftLineAlignMent', label: '왼쪽 다리 정렬', min: 0, max: 30 },
    { key: 'followChickenWing', scoreKey: 'followChickenWingScore', mentKey: 'followChickenWingMent', label: '치킨윙 각도', min: 90, max: 180 },
    { key: 'followCenterOfGravity', scoreKey: 'followCenterOfGravityScore', mentKey: 'followCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
  finish: [
    { key: 'finishLeftFootFix', scoreKey: 'finishLeftFootFixScore', mentKey: 'finishLeftFootFixMent', label: '왼발 고정', min: 0, max: 30 },
    { key: 'finishRightFootRotation', scoreKey: 'finishRightFootRotationScore', mentKey: 'finishRightFootRotationMent', label: '오른발 회전', min: 0, max: 90 },
    { key: 'finishCenterOfGravity', scoreKey: 'finishCenterOfGravityScore', mentKey: 'finishCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
}

export default function AnalysisResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const analysisId = searchParams.get("analysisId")
  const videoRef = useRef<HTMLVideoElement>(null)

  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState<string>("1. 어드레스")
  const [isMemoPopupOpen, setIsMemoPopupOpen] = useState(false)
  const [memo, setMemo] = useState("")
  const [tempMemo, setTempMemo] = useState("")
  const [error, setError] = useState<string | null>(null)

  // 분석 데이터 로드
  const loadAnalysis = useCallback(async () => {
    if (!analysisId) return
    try {
      const data = await getGolfSwingAnalysis(parseInt(analysisId))
      if (data) {
        setAnalysis(data)
        setMemo(data.memo || "")
      }
    } catch (err) {
      console.error("분석 데이터 로드 실패:", err)
      setError("분석 데이터를 불러올 수 없습니다.")
    }
  }, [analysisId])

  // 회원 정보 로드
  const loadMember = useCallback(async () => {
    if (!memberId) return
    try {
      const data = await getSubjectDetail(parseInt(memberId))
      if (data) {
        setMember(data)
      }
    } catch (err) {
      console.error("회원 정보 로드 실패:", err)
    }
  }, [memberId])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([loadMember(), loadAnalysis()])
      setIsLoading(false)
    }
    load()
  }, [loadMember, loadAnalysis])

  // 결과 새로고침 (REMO API에서 결과 가져오기)
  const handleRefresh = async () => {
    if (!analysisId) return
    setIsRefreshing(true)
    setError(null)
    try {
      const result = await refreshGolfSwingAnalysis(parseInt(analysisId))
      if (result) {
        if (result.status === 'completed') {
          // 결과가 저장됨 - 분석 데이터 다시 로드
          await loadAnalysis()
        } else if (result.status === 'processing') {
          setError("분석이 아직 진행 중입니다. 잠시 후 다시 시도해주세요.")
        } else {
          setError(result.message)
        }
      }
    } catch (err) {
      setError("결과 새로고침에 실패했습니다.")
    } finally {
      setIsRefreshing(false)
    }
  }

  // 메모 저장
  const handleSaveMemo = async () => {
    if (!analysisId) return
    const success = await updateGolfSwingMemo(parseInt(analysisId), tempMemo)
    if (success) {
      setMemo(tempMemo)
      setIsMemoPopupOpen(false)
    }
  }

  const age = member?.birthDate ? calculateAge(member.birthDate) : null

  const handleBack = () => {
    if (memberId) {
      router.push(`/member/${memberId}`)
    } else {
      router.push("/")
    }
  }

  // 비디오 FPS (프레임을 시간으로 변환할 때 사용)
  const VIDEO_FPS = 30

  // 프레임 번호를 시간(초)으로 변환
  const frameToTime = (frame: number | null | undefined): number => {
    if (!frame) return 0
    return frame / VIDEO_FPS
  }

  // 단계별 정보 - 실제 분석 결과의 프레임 데이터 사용
  const phases: { name: string; key: SwingPhase; time: number }[] = [
    { name: "1. 어드레스", key: "address", time: frameToTime(analysis?.result?.addressFrame) },
    { name: "2. 테이크백", key: "takeback", time: frameToTime(analysis?.result?.takebackFrame) },
    { name: "3. 백스윙", key: "backswing", time: frameToTime(analysis?.result?.backswingFrame) },
    { name: "4. 백스윙탑", key: "backswingtop", time: frameToTime(analysis?.result?.backswingTopFrame) },
    { name: "5. 다운스윙", key: "downswing", time: frameToTime(analysis?.result?.downswingFrame) },
    { name: "6. 임팩트", key: "impact", time: frameToTime(analysis?.result?.impactFrame) },
    { name: "7. 팔로우스루", key: "follow", time: frameToTime(analysis?.result?.followFrame) },
    { name: "8. 피니시", key: "finish", time: frameToTime(analysis?.result?.finishFrame) },
  ]

  const handlePhaseClick = (phase: { name: string; time: number }) => {
    setSelectedPhase(phase.name)
    if (videoRef.current) {
      videoRef.current.currentTime = phase.time
      videoRef.current.pause() // 해당 프레임에서 멈추도록 변경
    }
  }

  const handleOpenMemoPopup = () => {
    setTempMemo(memo)
    setIsMemoPopupOpen(true)
  }

  const handleCloseMemoPopup = () => {
    setIsMemoPopupOpen(false)
    setTempMemo("")
  }

  const handleDownloadPDF = () => {
    alert("PDF 다운로드 기능이 실행됩니다")
  }

  const handleShare = () => {
    alert("회원과 공유 기능이 실행됩니다")
  }

  // 상태 배지 렌더링
  const renderStatusBadge = (status: AnalysisStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">완료</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-500 text-white">분석 중</Badge>
      case 'pending':
        return <Badge variant="secondary">대기 중</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 각도 데이터를 그래프 데이터로 변환 (z축 데이터 사용)
  const generateGraphData = () => {
    if (!analysis?.angle) {
      return []
    }

    const kneeLineData = analysis.angle.kneeLineData || []
    const pelvisData = analysis.angle.pelvisData || []
    const shoulderLineData = analysis.angle.shoulderLineData || []

    // 데이터가 모두 비어있으면 빈 배열 반환
    if (kneeLineData.length === 0 && pelvisData.length === 0 && shoulderLineData.length === 0) {
      return []
    }

    const maxFrames = Math.max(
      kneeLineData.length,
      pelvisData.length,
      shoulderLineData.length
    )

    const graphData = []
    // 최대 50개 포인트로 샘플링
    const step = Math.max(1, Math.floor(maxFrames / 50))
    for (let i = 0; i < maxFrames; i += step) {
      graphData.push({
        frame: i,
        kneeLine: kneeLineData[i]?.[2] ?? 0, // z-axis angle (index 2)
        pelvis: pelvisData[i]?.[2] ?? 0,
        shoulderLine: shoulderLineData[i]?.[2] ?? 0,
      })
    }
    return graphData
  }

  // 단계별 분석 항목 렌더링
  const renderPhaseMetrics = (phaseKey: string) => {
    const fields = PHASE_FIELDS[phaseKey as keyof typeof PHASE_FIELDS]
    if (!fields || !analysis?.result) return null

    return fields.map((field) => {
      const value = analysis.result[field.key]
      const score = analysis.result[field.scoreKey]
      const ment = analysis.result[field.mentKey] as 1 | 2 | 3 | null

      // 멘트 텍스트 가져오기
      const mentText = ment ? getCommentByFieldName(field.key, ment) : undefined

      return (
        <MetricIndicator
          key={field.key}
          value={value}
          min={field.min}
          max={field.max}
          label={field.label}
          ment={ment}
          mentText={mentText}
        />
      )
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!member && !analysis) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">분석 정보를 찾을 수 없습니다</h2>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const videoUrl = analysis?.resultVideoUrl || analysis?.videoUrl

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">스윙 분석 결과</h1>
              {analysis && renderStatusBadge(analysis.status)}
            </div>
            {analysis?.status !== 'completed' && (
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                결과 새로고침
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Member Info Card */}
        {member && (
          <div className="mb-6 flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{getGenderLabel(member.gender)}</span>
              </div>
              {member.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {member.birthDate} ({age}세)
                  </span>
                </div>
              )}
              {analysis?.analysisDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    측정: {new Date(analysis.analysisDate).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Column */}
          <div className="space-y-4">
            <Card className="overflow-hidden bg-muted/50">
              <CardContent className="p-0">
                <div className="relative aspect-[9/16] w-full bg-black">
                  {videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      className="h-full w-full object-contain"
                      playsInline
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      {analysis?.status === 'processing' ? (
                        <div className="text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                          <p>분석 중입니다...</p>
                        </div>
                      ) : (
                        <p>비디오가 없습니다</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phase Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">자세 단계 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {phases.map((phase) => (
                    <Button
                      key={phase.name}
                      variant={selectedPhase === phase.name ? "default" : "outline"}
                      className={`h-auto py-3 text-sm ${
                        selectedPhase === phase.name ? "bg-primary text-primary-foreground" : ""
                      }`}
                      onClick={() => handlePhaseClick(phase)}
                    >
                      {phase.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Analysis Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>자세 분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis?.status === 'completed' && analysis?.result ? (
                  (() => {
                    const feedback = classifyAnalysisResults(analysis.result);
                    return (
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* 강점 섹션 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <ThumbsUp className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">종합적 강점</h3>
                          </div>
                          <div className="space-y-2 rounded-lg bg-primary/5 p-4 border border-primary/20">
                            {feedback.strengths.length > 0 ? (
                              feedback.strengths.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
                                  <span>{item.comment}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground italic">분석 데이터가 없습니다</p>
                            )}
                          </div>
                        </div>

                        {/* 약점 섹션 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
                              <ThumbsDown className="h-4 w-4 text-orange-500" />
                            </div>
                            <h3 className="font-semibold text-foreground">종합적 약점</h3>
                          </div>
                          <div className="space-y-2 rounded-lg bg-orange-50 p-4 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900">
                            {feedback.weaknesses.length > 0 ? (
                              feedback.weaknesses.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-orange-500" />
                                  <span>{item.comment}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground italic">모든 항목이 양호합니다!</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <ThumbsUp className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">종합적 강점</h3>
                      </div>
                      <div className="space-y-2 rounded-lg bg-primary/5 p-4 border border-primary/20">
                        <p className="text-sm text-muted-foreground italic">분석이 완료되면 결과가 표시됩니다</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
                          <ThumbsDown className="h-4 w-4 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">종합적 약점</h3>
                      </div>
                      <div className="space-y-2 rounded-lg bg-orange-50 p-4 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900">
                        <p className="text-sm text-muted-foreground italic">분석이 완료되면 결과가 표시됩니다</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Graph Card */}
            <Card>
              <CardHeader>
                <CardTitle>자세 그래프 분석</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis?.status === 'completed' && analysis?.angle && generateGraphData().length > 0 ? (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={generateGraphData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="frame"
                          tick={{ fontSize: 10 }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          domain={[-30, 50]}
                          tick={{ fontSize: 10 }}
                          stroke="#9ca3af"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line
                          type="monotone"
                          dataKey="kneeLine"
                          stroke="#dc2626"
                          strokeWidth={1.5}
                          dot={false}
                          name="무릎"
                        />
                        <Line
                          type="monotone"
                          dataKey="pelvis"
                          stroke="#84cc16"
                          strokeWidth={1.5}
                          dot={false}
                          name="골반"
                        />
                        <Line
                          type="monotone"
                          dataKey="shoulderLine"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          dot={false}
                          name="어깨"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="mt-2 text-xs text-muted-foreground">
                      스윙 전체 구간에 걸친 신체 각 부위의 움직임과 각도 변화를 나타냅니다
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                    {analysis?.status === 'processing' ? (
                      <div className="space-y-2">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">분석이 진행 중입니다...</p>
                        <p className="text-xs text-muted-foreground">완료 후 "결과 새로고침" 버튼을 클릭해주세요</p>
                      </div>
                    ) : analysis?.status === 'completed' && !analysis?.angle ? (
                      <div className="space-y-2">
                        <AlertCircle className="mx-auto h-8 w-8 text-yellow-500" />
                        <p className="text-sm text-muted-foreground">각도 데이터를 불러올 수 없습니다</p>
                        <p className="text-xs text-muted-foreground">"결과 새로고침" 버튼을 클릭하여 데이터를 다시 불러와주세요</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">분석이 완료되면 그래프가 표시됩니다</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase-specific Cards */}
            {/* 1. Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. 어드레스</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('address')}
              </CardContent>
            </Card>

            {/* 2. Takeback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. 테이크백</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('takeback')}
              </CardContent>
            </Card>

            {/* 3. Backswing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. 백스윙</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('backswing')}
              </CardContent>
            </Card>

            {/* 4. Backswing Top */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. 백스윙탑</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('backswingtop')}
              </CardContent>
            </Card>

            {/* 5. Downswing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">5. 다운스윙</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('downswing')}
              </CardContent>
            </Card>

            {/* 6. Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">6. 임팩트</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('impact')}
              </CardContent>
            </Card>

            {/* 7. Follow Through */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">7. 팔로우스루</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('follow')}
              </CardContent>
            </Card>

            {/* 8. Finish */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">8. 피니시</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderPhaseMetrics('finish')}
              </CardContent>
            </Card>

            {/* Memo Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>메모</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleOpenMemoPopup}>
                    <Plus className="mr-1 h-4 w-4" />
                    메모 추가
                  </Button>
                </div>
              </CardHeader>
              {memo && (
                <CardContent>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{memo}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pb-6">
              <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                결과서 다운로드 (PDF)
              </Button>
              <Button size="lg" variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                회원과 공유하기
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Memo Popup Modal */}
      {isMemoPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <button
              onClick={handleCloseMemoPopup}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-2 text-lg font-bold text-foreground">{member?.name || '회원'} - 메모</h2>
            <p className="mb-4 text-sm text-muted-foreground">분석에 대한 메모를 작성하세요</p>
            <Textarea
              value={tempMemo}
              onChange={(e) => setTempMemo(e.target.value)}
              placeholder="스윙에 대한 코멘트를 입력하세요..."
              className="mb-4 min-h-[120px] rounded-md border-2 border-primary/20 focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseMemoPopup}>
                취소
              </Button>
              <Button onClick={handleSaveMemo} className="bg-primary hover:bg-primary/90">
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
