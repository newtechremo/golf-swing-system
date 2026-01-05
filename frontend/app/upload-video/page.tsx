"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Upload,
  ArrowLeft,
  Video,
  CheckCircle2,
  Calendar,
  User,
  Play,
  Pause,
  SkipBack,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"
import { uploadGolfSwingVideo, type SwingType } from "@/lib/golf-swing"

export default function UploadVideoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const swingType = searchParams.get("swingType")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showTrimming, setShowTrimming] = useState(false) // TODO: 구간선택 기능 추후 구현
  const [showReview, setShowReview] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(5)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const trimVideoRef = useRef<HTMLVideoElement>(null)

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

  const age = member?.birthDate ? calculateAge(member.birthDate) : null

  useEffect(() => {
    loadMember()
  }, [loadMember])

  useEffect(() => {
    if (showTrimming && trimVideoRef.current) {
      const video = trimVideoRef.current

      const handleLoadedMetadata = () => {
        const duration = video.duration
        setVideoDuration(duration)

        const center = duration / 2
        const start = Math.max(0, center - 2.5)
        const end = Math.min(duration, start + 5)
        setTrimStart(start)
        setTrimEnd(end)
        video.currentTime = start
      }

      const handleTimeUpdate = () => {
        const time = video.currentTime
        setCurrentTime(time)

        if (time >= trimEnd) {
          video.currentTime = trimStart
        }
      }

      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      video.addEventListener("timeupdate", handleTimeUpdate)

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.removeEventListener("timeupdate", handleTimeUpdate)
      }
    }
  }, [showTrimming, trimStart, trimEnd])

  const handleBack = () => {
    router.back()
  }

  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      alert("비디오 파일만 업로드 가능합니다")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(`파일 크기는 500MB를 초과할 수 없습니다.\n현재 파일 크기: ${(file.size / (1024 * 1024)).toFixed(1)}MB`)
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
  }

  const handleUpload = () => {
    if (!selectedFile) {
      alert("먼저 파일을 선택해주세요")
      return
    }

    // 구간선택 기능 비활성화 - 바로 미리보기 화면으로 이동
    setShowReview(true)

    /* TODO: 구간선택 기능 추후 구현
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setShowTrimming(true)
          }, 500)
          return 100
        }
        return prev + 10
      })
    }, 200)
    */
  }

  const handleTrimStartChange = (value: number[]) => {
    const newStart = value[0]
    const minEnd = newStart + 3

    setTrimStart(newStart)
    if (trimEnd < minEnd) {
      setTrimEnd(Math.min(videoDuration, minEnd))
    }
    if (trimVideoRef.current) {
      trimVideoRef.current.currentTime = newStart
    }
  }

  const handleTrimEndChange = (value: number[]) => {
    const newEnd = value[0]
    const maxStart = newEnd - 3

    setTrimEnd(newEnd)
    if (trimStart > maxStart) {
      setTrimStart(Math.max(0, maxStart))
    }
  }

  const handlePlayPause = () => {
    if (trimVideoRef.current) {
      if (isPlaying) {
        trimVideoRef.current.pause()
      } else {
        trimVideoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleRestart = () => {
    if (trimVideoRef.current) {
      trimVideoRef.current.currentTime = trimStart
      setCurrentTime(trimStart)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile || !memberId) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // 실제 API 호출하여 비디오 업로드 및 분석 시작
      const result = await uploadGolfSwingVideo(
        selectedFile,
        parseInt(memberId),
        (swingType as SwingType) || 'full',
        member?.height ? parseInt(member.height.toString()) : undefined
      )

      if (result && result.analysisId) {
        // 분석이 시작되면 analysisId와 함께 로딩 페이지로 이동
        router.push(`/analysis-loading?memberId=${memberId}&analysisId=${result.analysisId}`)
      } else {
        setUploadError('분석 시작에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error: unknown) {
      console.error('업로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      setUploadError(`업로드에 실패했습니다: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleReselect = () => {
    setSelectedFile(null)
    setVideoUrl(null)
    setShowTrimming(false)
    setShowReview(false)
    setUploadProgress(0)
  }

  const trimmedDuration = trimEnd - trimStart
  const isValidRange = trimmedDuration >= 3 && trimmedDuration <= 10

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`
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
      <div className="border-border px-4 py-4 sm:px-6 lg:px-8 border-b-0">
        <div className="mx-auto max-w-7xl">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
        </div>
      </div>

      <div className="border-border bg-background px-4 py-6 sm:px-6 lg:px-8 border-b">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{getGenderLabel(member.gender)}</span>
              </div>
              {member.birthDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{member.birthDate} ({age}세)</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>측정: {new Date().toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border bg-background px-4 py-8 sm:px-6 lg:px-8 border-b-0">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {showReview ? "영상 확인" : "AI 풀 스윙 자세분석 업로드"}
          </h1>
          <p className="text-muted-foreground">
            {showReview ? "영상을 확인하고 분석을 시작하세요" : "촬영된 스윙 영상을 업로드하세요"}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showReview && videoUrl ? (
          /* 영상 확인 및 분석하기 UI */
          <div className="space-y-8">
            <div className="flex gap-8">
              <div className="flex-shrink-0">
                <Card className="overflow-hidden bg-black w-[400px]">
                  <div className="relative aspect-[9/16]">
                    <video ref={trimVideoRef} src={videoUrl} className="h-full w-full object-cover" controls playsInline />
                  </div>
                </Card>

                <div className="flex flex-col gap-2 mt-4 w-[400px]">
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-center gap-4">
                    <Button size="lg" variant="outline" onClick={handleReselect} disabled={isUploading} className="flex-1 bg-transparent">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      다시 선택
                    </Button>
                    <Button size="lg" onClick={handleAnalyze} disabled={isUploading} className="flex-1">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-5 w-5" />
                          분석하기
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 안내 */}
              <div className="flex-1 space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-2">영상이 준비되었습니다!</h3>
                  <p className="text-sm text-muted-foreground">영상을 확인하고 분석하기 버튼을 눌러주세요</p>
                </Card>

                <Card className="p-6 bg-primary/5">
                  <h4 className="text-lg font-semibold mb-4">📋 분석 진행 안내</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>• 분석하기 버튼을 누르면 AI 분석이 시작됩니다</p>
                    <p>• 분석에는 약 30초~2분 정도 소요됩니다</p>
                    <p>• 다른 영상을 사용하려면 다시 선택 버튼을 눌러주세요</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* TODO: 구간선택 기능 - 추후 구현 예정
          showTrimming && videoUrl ? (
          <div className="space-y-8">
            <div className="flex gap-8">
              <div className="flex-shrink-0">
                <Card className="overflow-hidden bg-black w-[400px]">
                  <div className="relative aspect-[9/16]">
                    <video ref={trimVideoRef} src={videoUrl} className="h-full w-full object-cover" loop playsInline />
                    <div className="absolute bottom-4 right-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      전체 {formatTime(videoDuration)}
                    </div>
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleRestart}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-col gap-2 mt-4 w-[400px]">
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-center gap-4">
                    <Button size="lg" variant="outline" onClick={handleReselect} disabled={isUploading} className="flex-1 bg-transparent">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      다시 선택
                    </Button>
                    <Button size="lg" onClick={handleAnalyze} disabled={!isValidRange || isUploading} className="flex-1">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-5 w-5" />
                          분석하기
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-2">AI 분석을 위해 3~10초 길이의 구간만 선택할 수 있어요</h3>
                  <p className="text-sm text-muted-foreground">양쪽 핸들을 드래그해서 필요한 부분만 골라주세요</p>
                </Card>

                <Card className="p-6 bg-primary/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">🔍 선택된 구간</h4>
                    <div className={`text-2xl font-bold ${isValidRange ? "text-primary" : "text-destructive"}`}>
                      {trimmedDuration.toFixed(1)}초
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">시작: </span>
                        <span className="font-semibold">{formatTime(trimStart)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">종료: </span>
                        <span className="font-semibold">{formatTime(trimEnd)}</span>
                      </div>
                    </div>

                    {!isValidRange && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {trimmedDuration < 3 ? "최소 3초 이상 선택해야 해요" : "최대 10초까지만 선택할 수 있어요"}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </Card>

                <Card className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">시작 지점</label>
                      <span className="text-sm text-muted-foreground">{formatTime(trimStart)}</span>
                    </div>
                    <Slider
                      value={[trimStart]}
                      min={0}
                      max={Math.max(0, videoDuration - 3)}
                      step={0.1}
                      onValueChange={handleTrimStartChange}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">종료 지점</label>
                      <span className="text-sm text-muted-foreground">{formatTime(trimEnd)}</span>
                    </div>
                    <Slider
                      value={[trimEnd]}
                      min={Math.min(3, videoDuration)}
                      max={videoDuration}
                      step={0.1}
                      onValueChange={handleTrimEndChange}
                      className="w-full"
                    />
                  </div>

                  <div className="relative h-16 bg-muted rounded overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-primary/30 border-l-2 border-r-2 border-primary"
                      style={{
                        left: `${(trimStart / videoDuration) * 100}%`,
                        right: `${((videoDuration - trimEnd) / videoDuration) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary"
                      style={{
                        left: `${(currentTime / videoDuration) * 100}%`,
                      }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : */
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-2">영상 파일 선택</h2>
                    <p className="text-muted-foreground mb-6">MP4, MOV, AVI 형식의 영상 파일을 업로드하세요</p>
                  </div>

                  {selectedFile ? (
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
                        <Video className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>

                      {uploadProgress > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">업로드 진행중...</span>
                            <span className="font-semibold text-foreground">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                      <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 px-12 py-8 text-center hover:bg-primary/10 transition-colors">
                        <p className="text-lg font-semibold text-primary">파일 선택하기</p>
                        <p className="text-sm text-muted-foreground mt-1">또는 파일을 드래그하세요</p>
                      </div>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">업로드 안내</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>영상은 세로 방향으로 촬영된 파일을 권장합니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>전신이 모두 나오도록 촬영된 영상을 업로드하세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>파일 크기는 최대 500MB까지 지원됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>업로드 후 AI 분석까지 약 1-2분 소요됩니다</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" size="lg" onClick={handleBack}>
                취소
              </Button>
              <Button
                size="lg"
                onClick={handleUpload}
                disabled={!selectedFile || uploadProgress > 0}
                className="min-w-[200px]"
              >
                {uploadProgress > 0 ? `업로드 중... ${uploadProgress}%` : "다음 단계"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
