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
import { ListPlus, Target, Lightbulb } from "lucide-react"

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
  studentId?: string // This can be the "code"
}

interface StudentAnalytics {
  overallAverageScore: number
  totalExamsAttempted: number
  weaknesses: string[]
  suggestions: string[]
}

export default function StudentDashboard() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      return
    }
    setToken(savedToken)
    console.log("Auth Token found:", savedToken ? "Yes" : "No"); // Debugging

    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${savedToken}` }

        // Fetch student profile
        console.log("Fetching student profile from /api/profile..."); // Debugging
        const profileRes = await fetch("/api/profile", { headers })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData)
          console.log("Student profile fetched:", profileData); // Debugging
        } else {
          console.error("Failed to fetch student profile. Status:", profileRes.status, profileRes.statusText) // More detailed error
        }

        // Fetch student exams
        const examsRes = await fetch("/api/student/exams", { headers })
        if (examsRes.ok) {
          const examsData = await examsRes.json()
          if (Array.isArray(examsData)) {
            setExams(examsData)
          } else {
            console.error("Failed to fetch student exams: Data is not an array.", examsData)
            setExams([])
          }
        } else {
          console.error("Failed to fetch student exams:", examsRes.statusText)
          setExams([])
        }

        // Fetch student analytics
        const analyticsRes = await fetch("/api/student/analytics", { headers })
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json()
          setAnalytics(analyticsData)
        } else {
          console.error("Failed to fetch student analytics:", analyticsRes.statusText)
        }
      } catch (err) {
        console.error("Error during data fetching in StudentDashboardPage:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const upcomingExams = exams.filter((e) => !e.attempt_id)
  const completedExams = exams.filter((e) => e.attempt_id)

  return (
    <div className="min-h-screen bg-background">
      <StudentNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold">Welcome, {profile?.fullName || "Student"}!</h1>
          <p className="text-muted-foreground mt-2">Here's your dashboard at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Student Profile Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ListPlus className="h-5 w-5 text-primary" /> My Profile
            </h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Name:</span> {profile?.fullName || "N/A"}
              </p>
              <p>
                <span className="font-medium">Class:</span> {profile?.classLevel || "N/A"}
              </p>
              <p>
                <span className="font-medium">Student Code:</span> {profile?.studentId || "N/A"}
              </p>
            </div>
          </Card>

          {/* Performance Summary Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> My Performance
            </h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Exams Attempted:</span> {analytics?.totalExamsAttempted ?? 0}
              </p>
              <p>
                <span className="font-medium">Overall Average Score:</span>{" "}
                {analytics?.overallAverageScore !== undefined ? `${analytics.overallAverageScore}%` : "N/A"}
              </p>
              <Progress value={analytics?.overallAverageScore ?? 0} className="h-2 mt-2" />
            </div>
          </Card>

          {/* Weaknesses and Suggestions Card */}
          <Card className="p-6 col-span-1 md:col-span-2 lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" /> Insights
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg mb-2">Weaknesses:</h3>
                {analytics?.weaknesses && analytics.weaknesses.length > 0 ? (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {analytics.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No specific weaknesses identified yet.</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-medium text-lg mb-2">Suggestions for Improvement:</h3>
                {analytics?.suggestions && analytics.suggestions.length > 0 ? (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {analytics.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No specific suggestions available yet.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Original Upcoming Exams */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Available Exams</h2>
          {upcomingExams.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No exams available yet</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingExams.map((exam) => (
                <Card key={exam.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <h3 className="text-lg font-semibold">{exam.title}</h3>
                      <p className="text-sm text-muted-foreground">{exam.class_name}</p>
                      <div className="flex gap-3">
                        <Badge variant="outline">{exam.duration_minutes} mins</Badge>
                        <Badge variant="outline">{exam.total_marks} marks</Badge>
                      </div>
                    </div>
                    <Link href={`/student/exam/${exam.id}`}>
                      <Button>Start your exam</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Original Completed Exams */}
        {completedExams.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Results</h2>
            <div className="grid gap-4">
              {completedExams.map((exam) => (
                <Card key={exam.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <h3 className="text-lg font-semibold">{exam.title}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Score: {exam.score}/{exam.total_marks}
                          </span>
                          <span className="font-semibold">{Math.round((exam.score! / exam.total_marks) * 100)}%</span>
                        </div>
                        <Progress value={(exam.score! / exam.total_marks) * 100} className="h-2" />
                      </div>
                    </div>
                    <Link href={`/student/results/${exam.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
