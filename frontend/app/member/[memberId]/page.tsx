"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, User, Phone, Calendar, FileText, TrendingUp, Edit2, Save, X, Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  getSubjectDetail,
  updateSubject,
  deleteSubject,
  type SubjectDetail,
  getGenderLabel,
  calculateAge,
} from "@/lib/subjects"
import { deleteGolfSwingAnalysis } from "@/lib/golf-swing"
import { deleteBodyPostureAnalysis } from "@/lib/body-posture"

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.memberId as string

  const [member, setMember] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    gender: "" as "M" | "F" | "Other" | "",
    birthDate: "",
    phoneNumber: "",
    height: "",
    weight: "",
    memo: "",
  })

  const loadMember = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getSubjectDetail(parseInt(memberId))
      if (data) {
        setMember(data)
        setFormData({
          name: data.name || "",
          gender: data.gender || "",
          birthDate: data.birthDate || "",
          phoneNumber: data.phoneNumber || "",
          height: data.height?.toString() || "",
          weight: data.weight?.toString() || "",
          memo: data.memo || "",
        })
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

  const handleSave = async () => {
    if (!member) return

    setIsSaving(true)
    try {
      await updateSubject(member.id, {
        name: formData.name,
        gender: formData.gender as "M" | "F" | "Other" | undefined,
        birthDate: formData.birthDate || undefined,
        phoneNumber: formData.phoneNumber,
        height: formData.height ? parseInt(formData.height) : undefined,
        weight: formData.weight ? parseInt(formData.weight) : undefined,
        memo: formData.memo || undefined,
      })
      await loadMember()
      setIsEditing(false)
    } catch (error) {
      console.error("회원 정보 저장 실패:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (member) {
      setFormData({
        name: member.name || "",
        gender: member.gender || "",
        birthDate: member.birthDate || "",
        phoneNumber: member.phoneNumber || "",
        height: member.height?.toString() || "",
        weight: member.weight?.toString() || "",
        memo: member.memo || "",
      })
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!member) return

    setIsDeleting(true)
    try {
      const success = await deleteSubject(member.id)
      if (success) {
        router.push("/")
      }
    } catch (error) {
      console.error("회원 삭제 실패:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">완료</Badge>
      case "pending":
        return <Badge variant="secondary">진행중</Badge>
      case "failed":
        return <Badge variant="destructive">실패</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 골프 스윙 분석 삭제
  const handleDeleteSwingAnalysis = async (analysisId: number) => {
    const success = await deleteGolfSwingAnalysis(analysisId)
    if (success) {
      // 회원 데이터 새로고침
      loadMember()
    }
  }

  // 체형 분석 삭제
  const handleDeletePostureAnalysis = async (analysisId: number) => {
    const success = await deleteBodyPostureAnalysis(analysisId)
    if (success) {
      // 회원 데이터 새로고침
      loadMember()
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
          <h2 className="text-2xl font-bold text-foreground mb-4">회원을 찾을 수 없습니다</h2>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            회원 목록으로
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          회원 목록으로
        </Button>

        {/* Member Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                회원 정보
              </CardTitle>
              {!isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    수정
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isDeleting}>
                        {isDeleting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>회원 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          {member.name} 회원을 정말 삭제하시겠습니까?
                          <br />
                          삭제된 회원은 목록에서 더 이상 표시되지 않습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    취소
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    저장
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">{member.name}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">성별</p>
                        <p className="text-sm font-medium text-foreground">{getGenderLabel(member.gender)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">생년월일</p>
                        <p className="text-sm font-medium text-foreground">
                          {member.birthDate || "-"}
                          {member.birthDate && ` (${calculateAge(member.birthDate)}세)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">연락처</p>
                        <p className="text-sm font-medium text-foreground">{member.phoneNumber}</p>
                      </div>
                    </div>
                    {(member.height || member.weight) && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">키/체중</p>
                          <p className="text-sm font-medium text-foreground">
                            {member.height ? `${member.height}cm` : "-"} / {member.weight ? `${member.weight}kg` : "-"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">메모</p>
                      <div className="rounded-lg bg-muted p-3 min-h-[150px]">
                        {member.memo ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{member.memo}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">메모가 없습니다</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">성별</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as "M" | "F" | "Other" | "" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="">선택하세요</option>
                      <option value="M">남성</option>
                      <option value="F">여성</option>
                      <option value="Other">기타</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="birthDate">생년월일</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="mt-1"
                    />
                    {formData.birthDate && (
                      <p className="text-sm text-muted-foreground mt-1">({calculateAge(formData.birthDate)}세)</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">연락처</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="010-1234-5678"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="height">키 (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="170"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">체중 (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="70"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="memo">메모</Label>
                  <Textarea
                    id="memo"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="회원에 대한 메모를 입력하세요..."
                    className="mt-1 min-h-[280px] resize-none"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              최근 분석 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">분석 일시</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">분석 종류</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">상태</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">메모</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 골프 스윙 분석 이력 */}
                    {member.recentAnalyses?.golfSwing?.map((analysis) => (
                      <tr key={`swing-${analysis.id}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-foreground">
                          {new Date(analysis.date).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {analysis.swingType === 'full' ? '풀스윙' : '하프스윙'}
                        </td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(analysis.status)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate" title={analysis.memo || ''}>
                          {analysis.memo || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/analysis-result?memberId=${member.id}&analysisId=${analysis.id}`)}
                            >
                              상세보기
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>분석 결과 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    이 분석 결과를 삭제하시겠습니까?<br />
                                    삭제된 데이터는 복구할 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSwingAnalysis(analysis.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* 체형 분석 이력 */}
                    {member.recentAnalyses?.posture?.map((analysis) => (
                      <tr key={`posture-${analysis.id}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm text-foreground">
                          {new Date(analysis.date).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">체형분석</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(analysis.status)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate" title={analysis.memo || ''}>
                          {analysis.memo || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/body-analysis-result?memberId=${member.id}&analysisId=${analysis.id}`)}
                            >
                              상세보기
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>분석 결과 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    이 분석 결과를 삭제하시겠습니까?<br />
                                    삭제된 데이터는 복구할 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePostureAnalysis(analysis.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(!member.recentAnalyses?.golfSwing?.length && !member.recentAnalyses?.posture?.length) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">분석 이력이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
