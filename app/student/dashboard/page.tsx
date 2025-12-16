"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { StudentNav } from "@/components/student-nav"
import { Separator } from "@/components/ui/separator"
import { ListPlus, Target, Lightbulb, TrendingUp, Award, Zap, BookOpen, ArrowRight, Lock as LockIcon } from "lucide-react"
import { useAuth } from "@/lib/auth-client"

interface Exam {
  id: string
  title: string
  class_name: string
  duration_minutes: number
  total_marks: number
  attempt_id?: string
  score?: number
  status: string
}

interface StudentProfile {
  fullName: string
  classLevel?: string
  studentId?: string
  lockedExams?: boolean
  lockedDashboard?: boolean
}

interface StudentAnalytics {
  overallAverageScore: number
  totalExamsAttempted: number
  weaknesses: string[]
  suggestions: string[]
}

export default function StudentDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      setLoading(false)
      return
    }
    setToken(savedToken)
    setChecked(true)

    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${savedToken}` }

        const profileRes = await fetch("/api/profile", { headers })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData)
        } else if (profileRes.status === 403) {
          setProfile({ fullName: "", lockedDashboard: true })
        }

        const examsRes = await fetch("/api/student/exams", { headers })
        if (examsRes.ok) {
          const examsData = await examsRes.json()
          if (Array.isArray(examsData)) {
            setExams(examsData)
          } else {
            setExams([])
          }
        } else if (examsRes.status === 403) {
          setProfile((prev) => ({ ...(prev || { fullName: "" }), lockedExams: true }))
        }

        const analyticsRes = await fetch("/api/student/analytics", { headers })
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json()
          setAnalytics(analyticsData)
        } else if (analyticsRes.status === 403) {
          setProfile({ fullName: "", lockedDashboard: true })
        }

      } catch (err) {
        console.error("Error during data fetching:", err)
      } finally {
        setLoading(false)
      }
    }

    if (authLoading) {
      return
    }
    if (!user || user.role !== "student") {
      router.push("/login")
      setLoading(false)
      return
    }
    fetchDashboardData()
  }, [router, authLoading, user])

  if (!checked || loading || authLoading) {
    return null
  }

  if (profile?.lockedDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background flex items-center justify-center">
        <Card className="p-12 text-center border-red-500/30 bg-gradient-to-br from-card to-card/50">
          <LockIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Dashboard Locked</h2>
          <p className="text-muted-foreground">Your account dashboard has been locked by the admin.</p>
        </Card>
      </div>
    )
  }

  const upcomingExams = exams.filter((e) => !e.attempt_id)
  const completedExams = exams.filter((e) => e.attempt_id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      <StudentNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-12 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-3xl -z-10"></div>
            <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 md:p-10 border border-primary/20">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Welcome back, {profile?.fullName || "Student"}!
              </h1>
              <p className="text-lg text-muted-foreground">
                Track your progress and ace your exams with our AI-powered platform
              </p>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Profile Card */}
          <Card className="p-6 md:p-8 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out animate-slide-up-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <ListPlus className="h-5 w-5 text-primary" />
                </div>
                Profile
              </h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Full Name</p>
                <p className="text-lg font-semibold">{profile?.fullName || "N/A"}</p>
              </div>
              <Separator className="bg-border/50" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Class</p>
                  <p className="font-semibold text-primary">{profile?.classLevel || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">ID</p>
                  <p className="font-semibold text-accent">{profile?.studentId || "N/A"}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Card */}
          <Card className="p-6 md:p-8 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out animate-slide-up-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                Performance
              </h2>
              <TrendingUp className="h-5 w-5 text-accent/60" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Exams Attempted
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">{analytics?.totalExamsAttempted ?? 0}</span>
                  <span className="text-sm text-muted-foreground">attempts</span>
                </div>
              </div>
              <Separator className="bg-border/50" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Average Score</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-accent">
                    {analytics?.overallAverageScore !== undefined ? `${analytics.overallAverageScore}%` : "N/A"}
                  </span>
                  <Award className="h-5 w-5 text-accent/60" />
                </div>
                <Progress value={analytics?.overallAverageScore ?? 0} className="h-3" />
              </div>
            </div>
          </Card>

          {/* Insights Card */}
          <Card className="p-6 md:p-8 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out animate-slide-up-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-secondary" />
                </div>
                Insights
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Key Areas</p>
                {analytics?.weaknesses && analytics.weaknesses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.weaknesses.slice(0, 2).map((weakness, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {weakness}
                      </Badge>
                    ))}
                    {analytics.weaknesses.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{analytics.weaknesses.length - 2} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keep practicing to identify areas</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        

        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Available Exams</h2>
          <p className="text-muted-foreground mb-6">Take these exams to test your knowledge</p>
          {profile?.lockedExams ? (
            <Card className="p-12 text-center border-red-500/20 bg-gradient-to-br from-card to-card/50">
              <LockIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-500 text-lg">Exams are currently locked by admin</p>
            </Card>
          ) : upcomingExams.length === 0 ? (
            <Card className="p-12 text-center border-primary/20 bg-gradient-to-br from-card to-card/50">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No exams available yet. Create one to get started!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingExams.map((exam, index) => (
                <Card
                  key={exam.id}
                  className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out hover:-translate-y-1 group"
                  style={{
                    animation: `slideUp 0.5s ease-out ${index * 0.1}s forwards`,
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{exam.title}</h3>
                      <p className="text-sm text-muted-foreground">{exam.class_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {exam.duration_minutes} mins
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {exam.total_marks} marks
                      </Badge>
                    </div>
                    <Link href={`/student/exam/${exam.id}`} className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90 group-hover:shadow-lg transition-all duration-300">
                        Start Exam
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedExams.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Results</h2>
            <p className="text-muted-foreground mb-6">Review your past exam performance</p>
            <div className="grid gap-4 md:grid-cols-2">
              {completedExams.map((exam, index) => {
                const percentage = Math.round((exam.score! / exam.total_marks) * 100)
                const isExcellent = percentage >= 80
                const isGood = percentage >= 60
                return (
                  <Card
                    key={exam.id}
                    className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 ease-out"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{exam.title}</h3>
                          <p className="text-sm text-muted-foreground">{exam.class_name}</p>
                        </div>
                        {isExcellent && (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Excellent</Badge>
                        )}
                        {isGood && !isExcellent && (
                          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Good</Badge>
                        )}
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Score</span>
                          <span className="font-bold text-lg">
                            {exam.score}/{exam.total_marks}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs text-muted-foreground">Percentage</span>
                          <span
                            className={`font-bold text-sm ${isExcellent ? "text-green-600 dark:text-green-400" : isGood ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}
                          >
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <Link href={`/student/results/${exam.id}`}>
                        <Button
                          variant="outline"
                          className="w-full hover:bg-primary/10 transition-colors bg-transparent"
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
