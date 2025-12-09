"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { MenuIcon, BarChart3, BookOpen, PlusSquare, TrendingUp, LogOut, Users, FileText } from "lucide-react" // Added FileText icon

export function AdminNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  function handleLogout() {
    localStorage.removeItem("auth_token")
    router.push("/")
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/questions", label: "Question Bank", icon: BookOpen },
    { href: "/admin/exams/create", label: "Create Exam", icon: PlusSquare },
    { href: "/admin/exams/manage", label: "Manage Exams", icon: FileText }, // Added Manage Exams link
    { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-blue-900/20 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 backdrop-blur-sm shadow-lg shadow-blue-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/admin/dashboard" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Admin
          </span>
        </Link>

        <div className="hidden sm:flex gap-1 items-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/20"
                    : "text-slate-300 hover:text-blue-300 hover:bg-blue-500/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 text-slate-300 hover:text-blue-300 hover:bg-blue-500/10 transition-all duration-300"
              >
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border border-blue-900/30 shadow-xl">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="sm:hidden flex items-center">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-l border-blue-900/30"
            >
              <div className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </div>
              <nav className="flex flex-col gap-2 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        active
                          ? "bg-blue-500/20 text-blue-300"
                          : "text-slate-300 hover:text-blue-300 hover:bg-blue-500/10"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  )
                })}
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-4"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
