"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function TeacherNav() {
  const router = useRouter()

  function handleLogout() {
    localStorage.removeItem("auth_token")
    router.push("/")
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/teacher/dashboard" className="text-2xl font-bold text-primary">
          ExamPro
        </Link>

        <div className="flex gap-6 items-center">
          <Link href="/teacher/dashboard" className="text-sm font-medium hover:text-primary">
            Dashboard
          </Link>
          <Link href="/teacher/questions" className="text-sm font-medium hover:text-primary">
            Question Bank
          </Link>
          <Link href="/teacher/analytics" className="text-sm font-medium hover:text-primary">
            Analytics
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
