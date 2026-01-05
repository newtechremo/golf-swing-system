"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, X, User, Calendar, Camera, Loader2 } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { uploadBodyPostureImages } from "@/lib/body-posture"
import { extractApiError } from "@/lib/api"
import { getSubjectDetail, type SubjectDetail, getGenderLabel, calculateAge } from "@/lib/subjects"

type ImageType = "front" | "leftSide" | "rightSide" | "back"

// base64 문자열을 File 객체로 변환
function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export default function BodyAnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")
  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [leftSideImage, setLeftSideImage] = useState<string | null>(null)
  const [rightSideImage, setRightSideImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isWebcamOpen, setIsWebcamOpen] = useState(false)
  const [currentCaptureType, setCurrentCaptureType] = useState<ImageType | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showWebcamError, setShowWebcamError] = useState(false)

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

  const handleOpenWebcam = async (type: ImageType) => {
    setCurrentCaptureType(type)
    setIsWebcamOpen(true)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 1280 },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("웹캠 접근 오류:", error)
      setShowWebcamError(true)
      setIsWebcamOpen(false)
    }
  }

  const handleCloseWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsWebcamOpen(false)
    setCurrentCaptureType(null)
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !currentCaptureType) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = canvas.toDataURL("image/jpeg")
      handleSetImage(currentCaptureType, imageData)
      handleCloseWebcam()
    }
  }

  const handleSetImage = (type: ImageType, data: string) => {
    switch (type) {
      case "front":
        setFrontImage(data)
        break
      case "leftSide":
        setLeftSideImage(data)
        break
      case "rightSide":
        setRightSideImage(data)
        break
      case "back":
        setBackImage(data)
        break
    }
  }

  const handleImageUpload = (type: ImageType, file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      handleSetImage(type, result)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (type: ImageType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(type, file)
    }
  }

  const handleRemoveImage = (type: ImageType) => {
    handleSetImage(type, null as any)
  }

  const handleAnalyze = async () => {
    // 최소 1개 이상의 이미지가 있어야 함
    if ((!frontImage && !leftSideImage && !rightSideImage && !backImage) || !memberId) return

    setIsSubmitting(true)

    try {
      // 업로드된 이미지만 File 객체로 변환
      const images: {
        front?: File
        leftSide?: File
        rightSide?: File
        back?: File
      } = {}

      if (frontImage) images.front = base64ToFile(frontImage, 'front.jpg')
      if (leftSideImage) images.leftSide = base64ToFile(leftSideImage, 'leftSide.jpg')
      if (rightSideImage) images.rightSide = base64ToFile(rightSideImage, 'rightSide.jpg')
      if (backImage) images.back = base64ToFile(backImage, 'back.jpg')

      // 백엔드 API 호출
      const result = await uploadBodyPostureImages(images, parseInt(memberId))

      if (result) {
        // analysisId를 URL 파라미터로 전달
        router.push(`/body-analysis-loading?memberId=${memberId}&analysisId=${result.analysisId}`)
      } else {
        alert('분석 시작에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('분석 시작 오류:', error)
      const apiError = extractApiError(error)
      alert(`분석 오류: ${apiError.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getImage = (type: ImageType) => {
    switch (type) {
      case "front":
        return frontImage
      case "leftSide":
        return leftSideImage
      case "rightSide":
        return rightSideImage
      case "back":
        return backImage
    }
  }

  const getLabel = (type: ImageType) => {
    switch (type) {
      case "front":
        return "정면"
      case "leftSide":
        return "좌측면"
      case "rightSide":
        return "우측면"
      case "back":
        return "후면"
    }
  }

  const renderUploadCard = (type: ImageType) => {
    const image = getImage(type)
    const label = getLabel(type)

    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-3 text-center">{label}</h3>
          {image ? (
            <div className="relative">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                <Image src={image || "/placeholder.svg"} alt={`${label} view`} fill className="object-cover" />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => handleRemoveImage(type)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <label className="cursor-pointer">
                  <Button size="sm" variant="secondary" className="h-8 gap-1" asChild>
                    <span>
                      <Upload className="h-3 w-3" />
                      업로드
                    </span>
                  </Button>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(type, e)} />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent transition-colors"
                onClick={() => handleOpenWebcam(type)}
              >
                <Camera className="h-12 w-12 text-primary mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">클릭하여 촬영</p>
                <p className="text-xs text-muted-foreground">웹캠으로 촬영하기</p>
              </div>
              <label className="flex items-center justify-center gap-2 py-2 px-4 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">또는 파일 선택</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(type, e)} />
              </label>
            </div>
          )}
        </CardContent>
      </Card>
    )
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
      {/* Header */}
      <div className="border-border border-b-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Back Button */}
            <div>
              <Button variant="ghost" onClick={handleBack} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                뒤로가기
              </Button>
            </div>

            {/* Member Information */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{getGenderLabel(member.gender)}</span>
                </div>
                {member.birthDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{member.birthDate} ({age}세)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">AI 체형 분석</h2>
          <p className="text-muted-foreground">정면, 좌측면, 우측면, 후면 사진을 촬영하거나 업로드해주세요</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto mb-12">
          {renderUploadCard("front")}
          {renderUploadCard("leftSide")}
          {renderUploadCard("rightSide")}
          {renderUploadCard("back")}
        </div>

        {/* Tips */}
        <Card className="max-w-2xl mx-auto mb-8 bg-accent/50">
          <CardContent className="p-6">
            <h4 className="font-semibold text-foreground mb-3">촬영 팁</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>전신이 보이도록 촬영해주세요</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>밝은 조명 아래에서 촬영하면 더 정확한 분석이 가능합니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>몸에 밀착된 옷을 입으면 분석 정확도가 높아집니다</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>정면은 카메라를 정면으로 바라보고, 좌우 측면과 후면도 정확히 촬영해주세요</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={handleBack}>
            취소
          </Button>
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={(!frontImage && !leftSideImage && !rightSideImage && !backImage) || isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              '분석하기'
            )}
          </Button>
        </div>
      </main>

      <Dialog open={isWebcamOpen} onOpenChange={handleCloseWebcam}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentCaptureType && getLabel(currentCaptureType)} 촬영</DialogTitle>
            <DialogDescription>화면에 전신이 보이도록 위치를 조정한 후 촬영 버튼을 눌러주세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[600px] mx-auto">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleCloseWebcam}>
                취소
              </Button>
              <Button onClick={handleCapture} className="gap-2">
                <Camera className="h-4 w-4" />
                촬영하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWebcamError} onOpenChange={setShowWebcamError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>웹캠 접근 오류</AlertDialogTitle>
            <AlertDialogDescription>
              웹캠에 접근할 수 없습니다.
              <br />
              브라우저의 카메라 권한을 확인해주세요.
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
