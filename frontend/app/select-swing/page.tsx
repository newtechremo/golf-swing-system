"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Calendar, ArrowLeft, Video, Upload, Loader2 } from "lucide-react"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SelectSwingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const [selectedSwing, setSelectedSwing] = useState<"body" | "full" | "half" | "putting" | null>(null)
  const [showPreparingAlert, setShowPreparingAlert] = useState(false)
  const [showRecordingMethodDialog, setShowRecordingMethodDialog] = useState(false)
  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    loadMember()
  }, [loadMember])

  const age = member?.birthDate ? calculateAge(member.birthDate) : null

  const handleBack = () => {
    router.back()
  }

  const handleSelect = (type: "body" | "full" | "half" | "putting") => {
    if (type === "half" || type === "putting") {
      setShowPreparingAlert(true)
      return
    }

    setSelectedSwing(type)
    if (type === "full") {
      setShowRecordingMethodDialog(true)
    } else {
      setTimeout(() => {
        router.push(`/body-analysis?memberId=${memberId}`)
      }, 200)
    }
  }

  const handleRecordingMethod = (method: "record" | "upload") => {
    setShowRecordingMethodDialog(false)
    if (method === "record") {
      router.push(`/shoot?memberId=${memberId}&swingType=full`)
    } else {
      router.push(`/upload-video?memberId=${memberId}&swingType=full`)
    }
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
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Back Button */}
            <div>
              <Button variant="ghost" onClick={handleBack} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                뒤로가기
              </Button>
            </div>

            {/* Member Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{member.name}</p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{getGenderLabel(member.gender)}</span>
                </div>
                {member.birthDate && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {member.birthDate} ({age}세)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>측정: {new Date().toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">AI 체형모션 분석</h2>
        </div>

        {/* Analysis Type Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {/* Body Analysis Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-xl ${
              selectedSwing === "body"
                ? "ring-2 ring-primary bg-accent scale-105"
                : "hover:scale-105 hover:border-primary/50"
            }`}
            onClick={() => handleSelect("body")}
          >
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">체형분석</h3>
                  <p className="text-muted-foreground">몸의 불균형 분석</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">정면/측면/후면 사진 분석</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Swing Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-xl ${
              selectedSwing === "full"
                ? "ring-2 ring-primary bg-accent scale-105"
                : "hover:scale-105 hover:border-primary/50"
            }`}
            onClick={() => handleSelect("full")}
          >
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">풀 스윙</h3>
                  <p className="text-muted-foreground">파크골프 풀스윙 자세 분석 (동영상)</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">백스윙부터 피니시까지 8단계 분석</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Half Swing Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-xl ${
              selectedSwing === "half"
                ? "ring-2 ring-primary bg-accent scale-105"
                : "hover:scale-105 hover:border-primary/50"
            }`}
            onClick={() => handleSelect("half")}
          >
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">하프 스윙</h3>
                  <p className="text-muted-foreground">파크골프 짧은 스윙 분석 (동영상)</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">어드레스부터 피니시까지 4단계 분석</p>
                </div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    준비중
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Putting Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-xl ${
              selectedSwing === "putting"
                ? "ring-2 ring-primary bg-accent scale-105"
                : "hover:scale-105 hover:border-primary/50"
            }`}
            onClick={() => handleSelect("putting")}
          >
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">퍼팅</h3>
                  <p className="text-muted-foreground">파크골프 퍼팅 분석 (동영상)</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">퍼팅 동작의 정확도 분석</p>
                </div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    준비중
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={showRecordingMethodDialog} onOpenChange={setShowRecordingMethodDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>영상 촬영 방법 선택</AlertDialogTitle>
            <AlertDialogDescription>촬영하거나 기존 영상을 업로드할 수 있습니다</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 bg-transparent"
              onClick={() => handleRecordingMethod("record")}
            >
              <Video className="h-8 w-8" />
              <span>촬영하기</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 bg-transparent"
              onClick={() => handleRecordingMethod("upload")}
            >
              <Upload className="h-8 w-8" />
              <span>업로드</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRecordingMethodDialog(false)}>취소</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPreparingAlert} onOpenChange={setShowPreparingAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>준비중입니다</AlertDialogTitle>
            <AlertDialogDescription>
              현재 열심히 AI 준비중입니다.
              <br />
              조금만 기다려주시면 곧 이용하실 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
