"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, FileText, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUser, isLoggedIn } from "@/lib/auth"
import {
  getSubjects,
  createSubject,
  updateSubject,
  type SubjectListItem,
  type CreateSubjectRequest,
  getGenderLabel,
  calculateAge,
  formatPhoneNumber,
  isValidPhoneNumber,
} from "@/lib/subjects"

export default function SelectMemberPage() {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<SubjectListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [memoDialogOpen, setMemoDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<SubjectListItem | null>(null)
  const [editingMemo, setEditingMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [userName, setUserName] = useState<string | null>(null)

  const [newMember, setNewMember] = useState<CreateSubjectRequest>({
    name: "",
    phoneNumber: "",
    gender: undefined,
    birthDate: undefined,
    height: undefined,
    weight: undefined,
    email: undefined,
    memo: undefined,
  })

  // 회원 목록 로드
  const loadMembers = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const result = await getSubjects({
        search,
        status: "active",
        limit: 100,
      })
      if (result) {
        setMembers(result.data)
      }
    } catch (err) {
      console.error("회원 목록 로드 실패:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 초기 로드 및 인증 체크
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login")
      return
    }
    // 클라이언트에서만 사용자 정보 로드 (hydration 오류 방지)
    const user = getCurrentUser()
    setUserName(user?.name ?? null)
    loadMembers()
  }, [router, loadMembers])

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers(searchQuery || undefined)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, loadMembers])

  const handleAddMember = async () => {
    setError("")

    if (!newMember.name || !newMember.phoneNumber) {
      setError("이름과 전화번호는 필수입니다")
      return
    }

    if (!isValidPhoneNumber(newMember.phoneNumber)) {
      setError("전화번호는 010-0000-0000 형식이어야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      await createSubject(newMember)
      await loadMembers()
      setNewMember({
        name: "",
        phoneNumber: "",
        gender: undefined,
        birthDate: undefined,
        height: undefined,
        weight: undefined,
        email: undefined,
        memo: undefined,
      })
      setIsDialogOpen(false)
    } catch (err) {
      setError("회원 추가에 실패했습니다")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectMember = (memberId: number) => {
    router.push(`/select-swing?memberId=${memberId}`)
  }

  const handleOpenMemo = (member: SubjectListItem) => {
    setSelectedMember(member)
    setEditingMemo(member.memo || "")
    setMemoDialogOpen(true)
  }

  const handleSaveMemo = async () => {
    if (selectedMember) {
      setIsSubmitting(true)
      try {
        await updateSubject(selectedMember.id, { memo: editingMemo })
        await loadMembers()
        setMemoDialogOpen(false)
      } catch (err) {
        console.error("메모 저장 실패:", err)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleMemberNameClick = (memberId: number) => {
    router.push(`/member/${memberId}`)
  }

  const formatPhonePreview = (phone: string) => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length >= 4) {
      return `****-${digits.slice(-4)}`
    }
    return phone
  }

  const formatBirthDate = (date?: string) => {
    if (!date) return "-"
    const d = new Date(date)
    const year = d.getFullYear().toString().slice(2)
    const month = (d.getMonth() + 1).toString().padStart(2, "0")
    const day = d.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">회원 목록</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {userName ? `${userName}님의 회원` : "회원"} {members?.length ?? 0}명
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                회원 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>새 회원 추가</DialogTitle>
                <DialogDescription>회원 정보를 입력해주세요</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    이름 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="홍길동"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact">
                    전화번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact"
                    value={newMember.phoneNumber}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phoneNumber: formatPhoneNumber(e.target.value) })
                    }
                    placeholder="010-1234-5678"
                    required
                  />
                </div>
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm text-muted-foreground mb-4">선택 정보</p>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="height">키 (cm)</Label>
                        <Input
                          id="height"
                          value={newMember.height || ""}
                          onChange={(e) =>
                            setNewMember({
                              ...newMember,
                              height: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="180"
                          type="number"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="weight">체중 (kg)</Label>
                        <Input
                          id="weight"
                          value={newMember.weight || ""}
                          onChange={(e) =>
                            setNewMember({
                              ...newMember,
                              weight: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="70"
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="gender">성별</Label>
                      <Select
                        value={newMember.gender || ""}
                        onValueChange={(value) =>
                          setNewMember({
                            ...newMember,
                            gender: value as "M" | "F" | "Other" | undefined,
                          })
                        }
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">남성</SelectItem>
                          <SelectItem value="F">여성</SelectItem>
                          <SelectItem value="Other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="birthDate">생년월일</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={newMember.birthDate || ""}
                        onChange={(e) =>
                          setNewMember({
                            ...newMember,
                            birthDate: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMember.email || ""}
                        onChange={(e) =>
                          setNewMember({
                            ...newMember,
                            email: e.target.value || undefined,
                          })
                        }
                        placeholder="example@email.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="memo">메모</Label>
                      <Textarea
                        id="memo"
                        value={newMember.memo || ""}
                        onChange={(e) =>
                          setNewMember({
                            ...newMember,
                            memo: e.target.value || undefined,
                          })
                        }
                        placeholder="특이사항이나 주의할 점을 입력하세요"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="button" onClick={handleAddMember} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    "추가"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="이름 또는 연락처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[768px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">번호</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">이름</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">동작</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">성별</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">연락처</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">생년월일</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">키/체중</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">분석</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-foreground sm:px-6">메모</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr
                      key={member.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">{index + 1}</td>
                      <td className="px-4 py-4 text-sm font-medium sm:px-6">
                        <button
                          onClick={() => handleMemberNameClick(member.id)}
                          className="text-primary hover:underline"
                        >
                          {member.name}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm sm:px-6">
                        <Button size="sm" variant="outline" onClick={() => handleSelectMember(member.id)}>
                          AI분석
                        </Button>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">
                        {getGenderLabel(member.gender)}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">
                        <span title={member.phoneNumber} className="cursor-help">
                          {formatPhonePreview(member.phoneNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">
                        {formatBirthDate(member.birthDate)}
                        {member.birthDate && (
                          <span className="text-muted-foreground ml-1">
                            ({calculateAge(member.birthDate)}세)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">
                        {member.height && member.weight ? `${member.height}cm/${member.weight}kg` : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground sm:px-6">
                        <span className="text-xs">
                          스윙: {member.analysisCount.golfSwing} / 체형: {member.analysisCount.posture}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm sm:px-6">
                        <button
                          onClick={() => handleOpenMemo(member)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">보기</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* No Results */}
            {members.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? "검색 결과가 없습니다" : "등록된 회원이 없습니다"}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={memoDialogOpen} onOpenChange={setMemoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMember?.name} - 메모</DialogTitle>
            <DialogDescription>회원 메모를 확인하고 수정할 수 있습니다</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editingMemo}
              onChange={(e) => setEditingMemo(e.target.value)}
              placeholder="특이사항이나 주의할 점을 입력하세요"
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMemoDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleSaveMemo} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
