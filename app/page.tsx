"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookOpen, BarChart3, Clock, Users, Sparkles, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { HeroSection } from "@/components/hero-section"

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "glass-effect border-b shadow-lg" : "bg-background/95 border-b border-border"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold gradient-text">ExamPro</span>
          </div>
          <div className="space-x-3 flex items-center">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-secondary/20">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full blur-3xl animate-pulse opacity-50"></div>
        </div>

        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-balance">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, manage, and excel at exams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="glass-effect border backdrop-blur p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group cursor-pointer animate-slide-up">
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Create Custom Exams</h3>
                <p className="text-muted-foreground">
                  Design exams with MCQs, true/false, fill-in-the-blanks, and essay questions in minutes.
                </p>
              </div>
            </Card>

            {/* Feature 2 */}
            <Card
              className="glass-effect border backdrop-blur p-6 hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/10 group cursor-pointer animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 group-hover:shadow-lg group-hover:shadow-secondary/30 transition-all">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Timed Exams</h3>
                <p className="text-muted-foreground">
                  Real-time countdown timer with auto-save every 10 seconds and auto-submission.
                </p>
              </div>
            </Card>

            {/* Feature 3 */}
            <Card
              className="glass-effect border backdrop-blur p-6 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10 group cursor-pointer animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 group-hover:shadow-lg group-hover:shadow-accent/30 transition-all">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">Instant Results</h3>
                <p className="text-muted-foreground">
                  Automatic marking for objective questions with detailed performance analytics.
                </p>
              </div>
            </Card>

            {/* Feature 4 */}
            <Card
              className="glass-effect border backdrop-blur p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group cursor-pointer animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Student Leaderboard</h3>
                <p className="text-muted-foreground">
                  Motivate students with live leaderboards, rankings, and achievement badges.
                </p>
              </div>
            </Card>

            {/* Feature 5 */}
            <Card
              className="glass-effect border backdrop-blur p-6 hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/10 group cursor-pointer animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 group-hover:shadow-lg group-hover:shadow-secondary/30 transition-all">
                  <Sparkles className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Practice Mode</h3>
                <p className="text-muted-foreground">
                  Unlimited practice tests with topic-wise questions for skill development.
                </p>
              </div>
            </Card>

            {/* Feature 6 */}
            <Card
              className="glass-effect border backdrop-blur p-6 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10 group cursor-pointer animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="space-y-4">
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 group-hover:shadow-lg group-hover:shadow-accent/30 transition-all">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">GES Aligned</h3>
                <p className="text-muted-foreground">
                  100% aligned with GES Computing curriculum for Basic 7 & 8 students.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="glass-effect rounded-2xl p-8 md:p-16 border backdrop-blur-xl">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2 animate-fade-in">
                <div className="text-4xl md:text-5xl font-bold gradient-text">500+</div>
                <p className="text-muted-foreground">Educators</p>
              </div>
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="text-4xl md:text-5xl font-bold gradient-text">10K+</div>
                <p className="text-muted-foreground">Students</p>
              </div>
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="text-4xl md:text-5xl font-bold gradient-text">50K+</div>
                <p className="text-muted-foreground">Exams Created</p>
              </div>
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="text-4xl md:text-5xl font-bold gradient-text">99.9%</div>
                <p className="text-muted-foreground">Uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-balance">Ready to Transform Your Exams?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join hundreds of educators and thousands of students using ExamPro today.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register?role=teacher">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-0 px-8"
                >
                  Start Teaching
                </Button>
              </Link>
              <Link href="/register?role=student">
                <Button size="lg" variant="outline" className="px-8 bg-transparent">
                  Start Learning
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold gradient-text">ExamPro</span>
                </div>
                <p className="text-sm text-muted-foreground">Making education assessment simple and effective.</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Documentation
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Terms
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition">
                      Security
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-8">
              <p className="text-sm text-muted-foreground text-center">© 2025 ExamPro. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
