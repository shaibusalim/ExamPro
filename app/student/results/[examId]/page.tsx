"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StudentNav } from "@/components/student-nav"
import { Download } from "lucide-react"

interface Result {
  score: number
  total_marks: number
  percentage: number
  submitted_at: string
  feedback?: string
}

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch results data
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    // This would fetch from an API endpoint
    setResult({
      score: 78,
      total_marks: 100,
      percentage: 78,
      submitted_at: new Date().toISOString(),
      feedback: "Great job! Keep practicing.",
    })
    setLoading(false)
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!result) {
    return <div className="flex items-center justify-center min-h-screen">No results found</div>
  }

  const isPassed = result.percentage >= 50

  return (
    <div className="min-h-screen bg-background">
      <StudentNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Exam Results</h1>
          <p className="text-muted-foreground">Your performance summary</p>
        </div>

        {/* Score Card */}
        <Card className="p-12 mb-8 text-center space-y-6">
          <div>
            <div className={`text-6xl font-bold ${isPassed ? "text-green-600" : "text-red-600"}`}>
              {result.percentage}%
            </div>
            <p className="text-2xl font-semibold mt-2">{isPassed ? "Passed!" : "Did Not Pass"}</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Score</span>
                <span className="font-semibold">
                  {result.score}/{result.total_marks}
                </span>
              </div>
              <Progress value={result.percentage} className="h-3" />
            </div>
          </div>

          {result.feedback && (
            <div className="bg-muted p-4 rounded-lg mt-6">
              <p className="text-sm text-muted-foreground">Feedback from teacher:</p>
              <p className="text-foreground mt-2">{result.feedback}</p>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download Result
          </Button>
          <Link href="/student/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
