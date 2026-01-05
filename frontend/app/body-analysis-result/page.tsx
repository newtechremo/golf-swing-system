"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Home, Target, Download, Share2, User, Calendar, Loader2 } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"
import api, { getImageUrl } from "@/lib/api"

type AnalysisItem = {
  label: string
  value: number
  rangeType: string
  status: "정상" | "주의" | "위험"
}

type AnalysisSection = {
  id: string
  title: string
  imageUrl: string
  items: AnalysisItem[]
}

// API 응답 타입 정의
interface AnalysisApiResponse {
  id: number
  subjectId: number
  analysisDate: string
  status: string
  memo?: string
  subject?: {
    id: number
    name: string
  }
  images: {
    front: { url: string | null; status: string }
    leftSide: { url: string | null; status: string }
    rightSide: { url: string | null; status: string }
    back: { url: string | null; status: string }
  }
  results: {
    front: FrontResult | null
    leftSide: SideResult | null
    rightSide: SideResult | null
    back: BackResult | null
  }
}

interface FrontResult {
  resultImageUrl: string | null
  headBalanceValue: number
  headBalanceGrade: number
  shoulderBalanceValue: number
  shoulderBalanceGrade: number
  pelvicBalanceValue: number
  pelvicBalanceGrade: number
  kneeBalanceValue: number
  kneeBalanceGrade: number
  bodyTiltValue: number
  bodyTiltGrade: number
  leftLegQAngleValue: number
  leftLegQAngleGrade: number
  rightLegQAngleValue: number
  rightLegQAngleGrade: number
}

interface SideResult {
  resultImageUrl: string | null
  turtleNeckValue: number
  turtleNeckGrade: number
  roundShoulderValue: number
  roundShoulderGrade: number
  bodyTiltValue: number
  bodyTiltGrade: number
  headTiltValue: number
  headTiltGrade: number
}

interface BackResult {
  resultImageUrl: string | null
  headBalanceValue: number
  headBalanceGrade: number
  shoulderBalanceValue: number
  shoulderBalanceGrade: number
  pelvicBalanceValue: number
  pelvicBalanceGrade: number
  kneeBalanceValue: number
  kneeBalanceGrade: number
  bodyTiltValue: number
  bodyTiltGrade: number
}

// Grade를 상태 문자열로 변환 (좌우 기울기용)
function gradeToStatus(grade: number): "정상" | "주의" | "위험" {
  if (grade === 0) return "정상"
  if (grade === -1 || grade === 1) return "주의"
  return "위험"
}

// 자세 등급을 상태 문자열로 변환 (거북목/라운드숄더용)
function postureGradeToStatus(grade: number): "정상" | "주의" | "위험" {
  if (grade === 0) return "정상"
  if (grade === 1) return "주의"
  return "위험"
}

function AnalysisBar({ item }: { item: AnalysisItem }) {
  const getBarColor = (status: string) => {
    switch (status) {
      case "정상":
        return "#6CC66C"
      case "주의":
        return "#FFD86B"
      case "위험":
        return "#FFA8A8"
      default:
        return "#6CC66C"
    }
  }

  const getPosition = (value: number, rangeType: string) => {
    if (rangeType === "left-right" || rangeType === "front-back") {
      const normalized = Math.min(Math.max(value, -10), 10)
      return ((normalized + 10) / 20) * 100
    }
    if (rangeType === "ox-left" || rangeType === "ox-right") {
      // Q-Angle 범위: -15 ~ 15도 (음수: X다리, 양수: O다리)
      const normalized = Math.min(Math.max(value, -15), 15)
      return ((normalized + 15) / 30) * 100
    }
    if (rangeType === "posture-grade") {
      // 거북목/라운드숄더: 0~60 범위, 낮으면 정상, 높으면 위험
      const normalized = Math.min(Math.max(value, 0), 60)
      return (normalized / 60) * 100
    }
    return 50
  }

  // rangeType에 따른 레이블 반환
  const getLabels = (rangeType: string): { left: string; center: string; right: string } => {
    switch (rangeType) {
      case "left-right":
        return { left: "좌", center: "정상", right: "우" }
      case "ox-left":
      case "ox-right":
        return { left: "X", center: "정상", right: "O" }
      case "front-back":
        return { left: "앞", center: "정상", right: "뒤" }
      case "posture-grade":
        return { left: "정상", center: "주의", right: "위험" }
      default:
        return { left: "좌", center: "정상", right: "우" }
    }
  }

  // null/undefined 값 처리 및 숫자 변환
  const rawValue = item.value
  const displayValue = typeof rawValue === 'number' ? rawValue : (parseFloat(String(rawValue)) || 0)
  const position = getPosition(displayValue, item.rangeType)
  const color = getBarColor(item.status)
  const labels = getLabels(item.rangeType)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{item.label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {displayValue.toFixed(1)}°
        </span>
      </div>
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 rounded-full transition-all"
          style={{
            left: `${Math.max(0, position - 20)}%`,
            width: "40%",
            backgroundColor: color,
            opacity: 0.3,
          }}
        />
        <div className="absolute inset-y-0 w-1 bg-blue-600 transition-all" style={{ left: `${position}%` }} />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs text-muted-foreground">
          <span>{labels.left}</span>
          <span>{labels.center}</span>
          <span>{labels.right}</span>
        </div>
      </div>
    </div>
  )
}

export default function BodyAnalysisResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const analysisId = searchParams.get("analysisId")

  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState<AnalysisApiResponse | null>(null)
  const [photos, setPhotos] = useState({
    front: "",
    leftSide: "",
    rightSide: "",
    back: "",
  })
  const [analysisResults, setAnalysisResults] = useState<AnalysisSection[]>([])

  const [memo, setMemo] = useState("")

  // API에서 분석 데이터를 분석 섹션으로 변환하는 함수
  const convertApiDataToSections = useCallback((data: AnalysisApiResponse): AnalysisSection[] => {
    const sections: AnalysisSection[] = []

    // 정면 결과
    if (data.results.front) {
      const front = data.results.front
      sections.push({
        id: "front",
        title: "1. 정면 사진 분석 결과",
        imageUrl: getImageUrl(data.images.front.url) || "/body-front-analysis-with-skeleton-overlay.jpg",
        items: [
          { label: "전신 좌우 기울기", value: front.bodyTiltValue, rangeType: "left-right", status: gradeToStatus(front.bodyTiltGrade) },
          { label: "머리 좌우 기울기", value: front.headBalanceValue, rangeType: "left-right", status: gradeToStatus(front.headBalanceGrade) },
          { label: "어깨 좌우 높이", value: front.shoulderBalanceValue, rangeType: "left-right", status: gradeToStatus(front.shoulderBalanceGrade) },
          { label: "골반 좌우 기울기", value: front.pelvicBalanceValue, rangeType: "left-right", status: gradeToStatus(front.pelvicBalanceGrade) },
          { label: "무릎 기울기", value: front.kneeBalanceValue, rangeType: "left-right", status: gradeToStatus(front.kneeBalanceGrade) },
          { label: "O/X 다리-왼다리", value: front.leftLegQAngleValue, rangeType: "ox-left", status: gradeToStatus(front.leftLegQAngleGrade) },
          { label: "O/X 다리-오른다리", value: front.rightLegQAngleValue, rangeType: "ox-right", status: gradeToStatus(front.rightLegQAngleGrade) },
        ],
      })
    }

    // 좌측면 결과
    if (data.results.leftSide) {
      const side = data.results.leftSide
      sections.push({
        id: "leftSide",
        title: "2. 좌측면 사진 분석 결과",
        imageUrl: getImageUrl(data.images.leftSide.url) || "/body-side-analysis-with-posture-lines.jpg",
        items: [
          { label: "거북목 검사", value: side.turtleNeckValue, rangeType: "posture-grade", status: postureGradeToStatus(side.turtleNeckGrade) },
          { label: "라운드 숄더", value: side.roundShoulderValue, rangeType: "posture-grade", status: postureGradeToStatus(side.roundShoulderGrade) },
          { label: "전신 앞뒤 기울기", value: side.bodyTiltValue, rangeType: "front-back", status: gradeToStatus(side.bodyTiltGrade) },
          { label: "머리 앞뒤 기울기", value: side.headTiltValue, rangeType: "front-back", status: gradeToStatus(side.headTiltGrade) },
        ],
      })
    }

    // 우측면 결과
    if (data.results.rightSide) {
      const side = data.results.rightSide
      sections.push({
        id: "rightSide",
        title: "3. 우측면 사진 분석 결과",
        imageUrl: getImageUrl(data.images.rightSide.url) || "/body-side-analysis-with-posture-lines.jpg",
        items: [
          { label: "거북목 검사", value: side.turtleNeckValue, rangeType: "posture-grade", status: postureGradeToStatus(side.turtleNeckGrade) },
          { label: "라운드 숄더", value: side.roundShoulderValue, rangeType: "posture-grade", status: postureGradeToStatus(side.roundShoulderGrade) },
          { label: "전신 앞뒤 기울기", value: side.bodyTiltValue, rangeType: "front-back", status: gradeToStatus(side.bodyTiltGrade) },
          { label: "머리 앞뒤 기울기", value: side.headTiltValue, rangeType: "front-back", status: gradeToStatus(side.headTiltGrade) },
        ],
      })
    }

    // 후면 결과
    if (data.results.back) {
      const back = data.results.back
      sections.push({
        id: "back",
        title: "4. 후면 사진 분석 결과",
        imageUrl: getImageUrl(data.images.back.url) || "/body-front-analysis-with-skeleton-overlay.jpg",
        items: [
          { label: "전신 좌우 기울기", value: back.bodyTiltValue, rangeType: "left-right", status: gradeToStatus(back.bodyTiltGrade) },
          { label: "머리 좌우 기울기", value: back.headBalanceValue, rangeType: "left-right", status: gradeToStatus(back.headBalanceGrade) },
          { label: "어깨 좌우 높이", value: back.shoulderBalanceValue, rangeType: "left-right", status: gradeToStatus(back.shoulderBalanceGrade) },
          { label: "골반 좌우 기울기", value: back.pelvicBalanceValue, rangeType: "left-right", status: gradeToStatus(back.pelvicBalanceGrade) },
          { label: "무릎 기울기", value: back.kneeBalanceValue, rangeType: "left-right", status: gradeToStatus(back.kneeBalanceGrade) },
        ],
      })
    }

    return sections
  }, [])

  // 분석 데이터 로드
  const loadAnalysisData = useCallback(async () => {
    if (!analysisId) return

    try {
      const response = await api.get<AnalysisApiResponse>(`/body-posture/analysis/${analysisId}`)
      const data = response.data
      setAnalysisData(data)

      // 이미지 URL 설정 (상대 경로를 API URL로 변환)
      setPhotos({
        front: getImageUrl(data.images.front.url),
        leftSide: getImageUrl(data.images.leftSide.url),
        rightSide: getImageUrl(data.images.rightSide.url),
        back: getImageUrl(data.images.back.url),
      })

      // 분석 결과를 섹션으로 변환
      const sections = convertApiDataToSections(data)
      setAnalysisResults(sections)

      // 메모 설정
      if (data.memo) {
        setMemo(data.memo)
      }

      // 회원 정보가 없으면 API 응답에서 가져오기 (memberId가 URL에 없는 경우)
      if (data.subject && data.subject.id && !memberId) {
        const subjectData = await getSubjectDetail(data.subject.id)
        if (subjectData) {
          setMember(subjectData)
        }
      }
    } catch (error) {
      console.error("분석 데이터 로드 실패:", error)
    }
  }, [analysisId, convertApiDataToSections, memberId])

  const loadMember = useCallback(async () => {
    if (!memberId) return
    setIsLoading(true)
    try {
      const data = await getSubjectDetail(parseInt(memberId))
      if (data) {
        setMember(data)
      }
    } catch (error) {
      console.error("회원 정보 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }, [memberId])

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 분석 데이터 로드
        if (analysisId) {
          await loadAnalysisData()
        }
        // 회원 정보 로드
        if (memberId) {
          await loadMember()
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [analysisId, memberId, loadAnalysisData, loadMember])

  const age = member?.birthDate ? calculateAge(member.birthDate) : null

  const handleHome = () => {
    router.push("/")
  }

  const handleDownloadPDF = () => {
    alert("PDF 다운로드 기능이 실행됩니다")
  }

  const handleShare = () => {
    alert("회원과 공유 기능이 실행됩니다")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">회원 정보를 찾을 수 없습니다</h2>
          <Button onClick={handleHome}>
            <Home className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">체형 분석 결과</h1>
              <p className="text-sm text-muted-foreground">좌우 불균형 분석 리포트</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4 rounded-lg border border-border bg-card p-4">
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
                <span className="text-muted-foreground">{member.birthDate} ({age}세)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">측정: {analysisData?.analysisDate ? new Date(analysisData.analysisDate).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-12 mb-12">
          {(analysisResults.length > 0 ? analysisResults : []).map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 border-b border-border px-6 py-4">
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8 p-6">
                  {/* Left: Image */}
                  <div className="flex justify-center items-start">
                    <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
                      {section.imageUrl && section.imageUrl.startsWith('http') ? (
                        <img
                          src={section.imageUrl}
                          alt={section.title}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Image
                          src={section.imageUrl || "/placeholder.svg"}
                          alt={section.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </div>

                  {/* Right: Analysis Table */}
                  <div className="space-y-6">
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 border-b border-border px-4 py-3 grid grid-cols-2 gap-4">
                        <span className="text-sm font-semibold text-foreground">분석 항목</span>
                        <span className="text-sm font-semibold text-foreground">체형 분석 결과</span>
                      </div>
                      <div className="p-4 space-y-6">
                        {section.items.map((item, idx) => (
                          <AnalysisBar key={idx} item={item} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {analysisResults.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>분석 결과가 없습니다.</p>
              <p className="text-sm mt-2">분석이 아직 완료되지 않았거나 분석 ID가 올바르지 않습니다.</p>
            </div>
          )}
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="memo" className="text-base font-semibold">
                메모
              </Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="체형 분석에 대한 전체 메모를 입력하세요..."
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button size="lg" variant="outline" onClick={handleHome}>
            <Home className="mr-2 h-4 w-4" />
            처음으로
          </Button>
          <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            결과서 다운로드 (PDF)
          </Button>
          <Button size="lg" variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            회원과 공유하기
          </Button>
        </div>
      </main>
    </div>
  )
}
