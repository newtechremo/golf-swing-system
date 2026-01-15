"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock } from "lucide-react"
import { login } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await login(email, password)
      if (user) {
        router.push("/main")
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다")
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center">
      {/* 메인 컨테이너 - 높이 기준 이미지 비율 (4:3) */}
      <div
        className="relative h-full w-full"
        style={{
          maxWidth: 'calc(100vh * 4 / 3)', // 이미지 비율 기준 최대폭
        }}
      >
        {/* 배경 이미지 - 오른쪽 정렬, 높이 맞춤 */}
        <img
          src="/login-bg.png"
          alt="ParkGolf AI Background"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />

        {/* 오버레이 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/30" />

        {/* 로그인 컴포넌트 - 좁으면 중앙, 넓으면 오른쪽 정렬 */}
        {/* 기준: 380px(컴포넌트) + 64px*2(패딩) = 508px → sm(640px) 사용 */}
        <div className="absolute inset-0 flex items-center justify-center sm:justify-end px-4 sm:pr-16 sm:pl-4">
          <div
            className="flex flex-col items-center justify-center w-full max-w-[380px]"
            style={{
              maxHeight: '100%',
            }}
          >
          {/* 타이틀 영역 */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold italic text-gray-800 tracking-wide">
              ParkGolf AI Pro.
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              파크골프 회원관리 프로그램
            </p>
          </div>

          {/* 로그인 카드 */}
          <Card className="w-full shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-medium">로그인</CardTitle>
              <CardDescription className="text-gray-500">
                계정에 접속하려면 로그인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5"
                  disabled={isLoading}
                >
                  {isLoading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 하단 브랜딩 */}
          <p className="text-xs mt-6" style={{ color: '#2051CD' }}>
            Powered by <span className="font-medium">REMO Motion AI</span>
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}
