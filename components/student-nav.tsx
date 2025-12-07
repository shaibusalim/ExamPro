"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, Home, BookOpen, Trophy, Zap, CheckCircle2, FileText } from "lucide-react"
import { useState } from "react"

export function StudentNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    router.push("/login")
  }

  const isActive = (href: string) => pathname === href

  const navLinks = [
    { href: "/student/dashboard", label: "Dashboard", icon: Home },
    { href: "/student/practice", label: "Practice", icon: Zap },
    { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/student/practice-results", label: "Practice Results", icon: CheckCircle2 },
    { href: "/student/exams", label: "Exam", icon: FileText },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10 backdrop-blur-xl shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/student/dashboard" className="flex items-center gap-2 group flex-shrink-0">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg group-hover:shadow-lg group-hover:shadow-primary/40 transition-all duration-300 transform group-hover:scale-110">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-hover:drop-shadow-md transition-all hidden sm:inline">
              StudyHub
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHoveredLink(link.href)}
                  onMouseLeave={() => setHoveredLink(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 relative group whitespace-nowrap ${
                    active
                      ? "text-primary bg-primary/15 shadow-sm"
                      : "text-foreground/60 hover:text-primary hover:bg-primary/8"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-transform duration-300 ${hoveredLink === link.href ? "scale-110 rotate-6" : ""}`}
                  />
                  {link.label}
                  {active && (
                    <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full shadow-sm"></div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-300 flex items-center gap-2 group"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 hover:bg-primary/10 rounded-lg transition-all duration-300 group"
            >
              <svg
                className={`h-6 w-6 transition-transform duration-300 ${isMenuOpen ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-primary/10 space-y-1 animate-slide-down">
            {navLinks.map((link, idx) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    animation: `slideUp 0.3s ease-out ${idx * 0.05}s backwards`,
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                    active
                      ? "text-primary bg-primary/15 shadow-sm"
                      : "text-foreground/60 hover:text-primary hover:bg-primary/8"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive/70 hover:text-destructive hover:bg-destructive/10 mt-3 rounded-lg"
              onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
