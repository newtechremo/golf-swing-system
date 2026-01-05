"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getCurrentUser, logout } from "@/lib/auth"
import { LogOut, KeyRound } from "lucide-react"

export function AuthHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setUserName(user.name)
    } else {
      setUserName(null)
    }
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handlePasswordChange = () => {
    router.push("/password")
  }

  // 로그인 페이지에서는 헤더 숨김
  if (pathname === "/login") {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="/main" className="hover:opacity-80 transition-opacity">
            <h1 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl text-balance">
              ParkGolf AI Pro. 파크골프 전문가 AI 분석 서비스
            </h1>
          </a>
          <div className="flex items-center gap-4">
            {userName && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-foreground sm:text-sm">그린필드 파크골프 센터</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">강사: {userName}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePasswordChange} title="비밀번호 변경">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout} title="로그아웃">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
