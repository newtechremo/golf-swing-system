"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Video, RotateCcw, Upload, AlertCircle, User, Calendar, Play, Pause, SkipBack, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"
import { uploadGolfSwingVideo, type SwingType } from "@/lib/golf-swing"

type RecordingState = "idle" | "countdown" | "recording" | "trimming" | "review"

export default function ShootPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const swingType = searchParams.get("swingType")

  const videoRef = useRef<HTMLVideoElement>(null)
  const trimVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [countdown, setCountdown] = useState(3)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(5)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    startWebcam()
    return () => {
      stopWebcam()
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (recordingState === "countdown" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (recordingState === "countdown" && countdown === 0) {
      startRecording()
    }
    return () => clearTimeout(timer)
  }, [recordingState, countdown])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (recordingState === "recording") {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [recordingState])

  useEffect(() => {
    if (recordingState === "trimming" && trimVideoRef.current) {
      const video = trimVideoRef.current

      const handleLoadedMetadata = () => {
        const duration = video.duration
        setVideoDuration(duration)

        // Auto-select center 5 seconds
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

        // Loop playback within selected range
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
  }, [recordingState, trimStart, trimEnd])

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 1280, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setError(null)
    } catch (err) {
      console.error("[v0] Webcam access error:", err)
      setError("웹캠 접근 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.")
    }
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleStartCountdown = () => {
    setRecordingState("countdown")
    setCountdown(3)
    setRecordingTime(0)
  }

  const startRecording = () => {
    if (!streamRef.current) return

    chunksRef.current = []
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      const url = URL.createObjectURL(blob)
      setRecordedVideoUrl(url)
      setRecordingState("review") // trimming 대신 review로 변경 (구간선택 기능 비활성화)
      stopWebcam()
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setRecordingState("recording")

    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        stopRecording()
      }
    }, 30000)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const handleRetake = () => {
    setRecordedVideoUrl(null)
    setRecordingState("idle")
    setRecordingTime(0)
    startWebcam()
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
    if (!recordedVideoUrl || !memberId) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // recordedVideoUrl (blob URL)을 실제 File 객체로 변환
      const response = await fetch(recordedVideoUrl)
      const blob = await response.blob()
      const videoFile = new File([blob], 'recorded-swing.webm', { type: 'video/webm' })

      // API 호출하여 비디오 업로드 및 분석 시작
      const result = await uploadGolfSwingVideo(
        videoFile,
        parseInt(memberId),
        (swingType as SwingType) || 'full',
        member?.height ? parseInt(member.height.toString()) : undefined
      )

      if (result && result.analysisId) {
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

  const handleBack = () => {
    router.back()
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
      <div className="border-border border-b-0">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between rounded-lg border-border p-4 border-0">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{getGenderLabel(member.gender)}</span>
              </div>
              {member.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {member.birthDate} ({age}세)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>측정: {new Date().toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center border-t">
          <h1 className="text-3xl font-bold text-foreground">
            {recordingState === "review" ? "영상 확인" : "AI 풀 스윙 자세분석"}
          </h1>
          {recordingState === "review" && <p className="text-muted-foreground mt-2">촬영된 영상을 확인하고 분석을 시작하세요</p>}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recordingState === "review" && recordedVideoUrl ? (
          /* 영상 확인 및 분석하기 UI */
          <div className="space-y-8">
            <div className="flex gap-8">
              {/* Video Preview */}
              <div className="flex-shrink-0">
                <Card className="overflow-hidden bg-black w-[400px]">
                  <div className="relative aspect-[9/16]">
                    <video
                      ref={trimVideoRef}
                      src={recordedVideoUrl}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                    />
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
                    <Button size="lg" variant="outline" onClick={handleRetake} disabled={isUploading} className="flex-1 bg-transparent">
                      <RotateCcw className="mr-2 h-5 w-5" />
                      재촬영
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
                  <h3 className="text-xl font-bold mb-2">촬영 완료!</h3>
                  <p className="text-sm text-muted-foreground">영상을 확인하고 분석하기 버튼을 눌러주세요</p>
                </Card>

                <Card className="p-6 bg-primary/5">
                  <h4 className="text-lg font-semibold mb-4">📋 분석 진행 안내</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>• 분석하기 버튼을 누르면 AI 분석이 시작됩니다</p>
                    <p>• 분석에는 약 30초~2분 정도 소요됩니다</p>
                    <p>• 영상이 마음에 들지 않으면 재촬영 해주세요</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* TODO: 구간선택 기능 - 추후 구현 예정
          recordingState === "trimming" && recordedVideoUrl ? (
          <div className="space-y-8">
            <div className="flex gap-8">
              <div className="flex-shrink-0">
                <Card className="overflow-hidden bg-black w-[400px]">
                  <div className="relative aspect-[9/16]">
                    <video
                      ref={trimVideoRef}
                      src={recordedVideoUrl}
                      className="h-full w-full object-cover"
                      loop
                      playsInline
                    />
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

                <div className="flex justify-center gap-4 mt-4 w-[400px]">
                  <Button size="lg" variant="outline" onClick={handleRetake} className="flex-1 bg-transparent">
                    <RotateCcw className="mr-2 h-5 w-5" />
                    재촬영
                  </Button>
                  <Button size="lg" onClick={handleAnalyze} disabled={!isValidRange} className="flex-1">
                    <Upload className="mr-2 h-5 w-5" />
                    분석하기
                  </Button>
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
          <div className="flex gap-8">
            <div className="flex-shrink-0">
              <Card className="overflow-hidden bg-black w-[400px]">
                <div className="relative aspect-[9/16]">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  {recordingState === "countdown" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-9xl font-bold text-white animate-pulse">{countdown}</div>
                    </div>
                  )}
                  {recordingState === "recording" && (
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2">
                        <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                        <span className="text-sm font-semibold text-white">녹화중 {recordingTime}초</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex justify-center gap-4 mt-4 w-[400px]">
                {recordingState === "idle" && (
                  <Button size="lg" onClick={handleStartCountdown} disabled={!!error} className="w-full">
                    <Video className="mr-2 h-5 w-5" />
                    촬영 시작
                  </Button>
                )}

                {recordingState === "recording" && (
                  <Button size="lg" variant="destructive" onClick={stopRecording} className="w-full">
                    녹화 중지
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">촬영 안내</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p>• 카메라가 전신을 담을 수 있도록 세로로 위치를 조정해주세요</p>
                  <p>• 촬영 시작 버튼을 누르면 3초 카운트다운 후 자동으로 녹화가 시작됩니다</p>
                  <p>• 녹화는 최대 30초간 진행되며 자동으로 종료됩니다</p>
                </div>
              </Card>

              <Card className="p-6 bg-accent">
                <h4 className="text-lg font-semibold text-foreground mb-4">촬영 팁</h4>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">충분한 조명 확보</p>
                      <p className="text-sm text-muted-foreground">밝은 환경에서 촬영하면 분석 정확도가 향상됩니다</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">카메라 위치 설정</p>
                      <p className="text-sm text-muted-foreground">측면에서 세로 방향으로 전신이 보이도록 촬영하세요</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">단순한 배경 선택</p>
                      <p className="text-sm text-muted-foreground">
                        복잡하지 않은 배경에서 촬영하면 정확한 자세 인식이 가능합니다
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">안정적인 카메라 고정</p>
                      <p className="text-sm text-muted-foreground">삼각대나 거치대를 사용하여 흔들림 없이 촬영하세요</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
