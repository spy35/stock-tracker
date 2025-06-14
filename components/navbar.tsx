"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"

  // 로그인 페이지나 회원가입 페이지에서는 네비게이션 바를 표시하지 않음
  if (pathname === "/login" || pathname === "/register") {
    return null
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold">
            주식 트래커
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              홈
            </Link>
            <Link href="/watchlist" className="text-sm font-medium transition-colors hover:text-primary">
              관심 종목
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-sm hidden md:inline-block">{session?.user?.name || session?.user?.email}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="로그아웃"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">
                <User className="h-4 w-4 mr-2" />
                로그인
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
