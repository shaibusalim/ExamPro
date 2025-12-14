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
  answers?: Array<{
    questionId: string
    question_text: string
    question_type: string
    marks: number
    marks_awarded: number
    is_correct: boolean
    student_answer: string | null
    correct_answer: string | null
  }>
}

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>("")
  const [unauthorized, setUnauthorized] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      setUnauthorized(true)
      router.push("/login")
      return
    }
    setUnauthorized(false)
    async function loadResult() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const p = params as any
        const examId = String(p.examId || "")
        // Primary: fetch direct attempt result
        const r1 = await fetch(`/api/student/exam/${examId}/result`, { headers })
        if (r1.ok) {
          const data = await r1.json()
          setResult({
            score: Number(data.score || 0),
            total_marks: Number(data.total_marks || 0),
            percentage: Number(data.percentage || 0),
            submitted_at: String(data.submitted_at || new Date().toISOString()),
          })
        } else {
          // Fallback: find in exams list
          const res = await fetch("/api/student/exams", { headers })
          if (!res.ok) {
            setResult(null)
            setLoading(false)
            return
          }
          const list = await res.json()
          const exam = Array.isArray(list) ? list.find((e: any) => String(e.id) === examId) : null
          if (!exam || exam.score === null || exam.score === undefined) {
            setResult(null)
            setLoading(false)
            return
          }
          const totalMarks = typeof exam.attempt_total_marks === 'number' && exam.attempt_total_marks > 0
            ? Number(exam.attempt_total_marks)
            : Number(exam.total_marks || 0)
          const percentage = typeof exam.attempt_percentage === 'number'
            ? Math.round(Number(exam.attempt_percentage))
            : (totalMarks > 0 ? Math.round((Number(exam.score) / totalMarks) * 100) : 0)
          setResult({
            score: Number(exam.score),
            total_marks: totalMarks,
            percentage,
            submitted_at: String(exam.attempt_submitted_at || new Date().toISOString()),
          })
        }
        // Fetch profile for name (for certificate)
        try {
          const profileRes = await fetch(`/api/profile`, { headers })
          if (profileRes.ok) {
            const profile = await profileRes.json()
            setStudentName(String(profile.fullName || ""))
          }
        } catch {}
      } catch {
        setResult(null)
      } finally {
        setLoading(false)
      }
    }
    loadResult()
  }, [router])

  if (unauthorized || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!result) {
    return <div className="flex items-center justify-center min-h-screen">No results found</div>
  }

  const isPassed = result.percentage >= 50

  function exportCSV() {
    if (!result) return
    const rows = [
      ["Student", studentName],
      ["Score", `${result.score}`],
      ["Total Marks", `${result.total_marks}`],
      ["Percentage", `${result.percentage}%`],
      ["Submitted At", result.submitted_at],
    ]
    const answers = Array.isArray(result.answers) ? result.answers : []
    if (answers.length > 0) {
      rows.push([""]) // blank line
      rows.push(["Question", "Your Answer", "Correct Answer", "Marks Awarded", "Marks", "Status"])
      for (const a of answers) {
        rows.push([
          a.question_text,
          a.student_answer ?? "",
          a.correct_answer ?? "",
          String(a.marks_awarded ?? ""),
          String(a.marks ?? ""),
          a.is_correct ? "Correct" : "Wrong",
        ])
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exam-result-${(result.submitted_at || '').slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function openCertificate() {
    if (!result) return
    const date = new Date(result.submitted_at)
    const win = window.open("", "_blank")
    if (!win) return
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificate of Completion</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; }
      .cert { max-width: 800px; margin: 40px auto; padding: 48px; border: 8px solid #1e293b; background: white; }
      .title { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 16px; }
      .subtitle { font-size: 16px; text-align: center; color: #334155; margin-bottom: 32px; }
      .name { font-size: 24px; font-weight: 700; text-align: center; margin: 16px 0; }
      .meta { display: flex; justify-content: center; gap: 24px; margin-top: 24px; color: #334155; }
      .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #64748b; }
      @media print { .print-hide { display: none; } }
      .stamp { margin-top: 24px; text-align: center; color: #475569; }
    </style>
  </head>
  <body>
    <div class="cert">
      <div class="title">Certificate of Completion</div>
      <div class="subtitle">This certifies that</div>
      <div class="name">${studentName || "Student"}</div>
      <div class="subtitle">has successfully completed the examination with the following achievement:</div>
      <div style="text-align:center; font-size:20px; font-weight:700; margin-top: 16px;">${result.percentage}%</div>
      <div class="meta">
        <div>Score: ${result.score}/${result.total_marks}</div>
        <div>Date: ${date.toLocaleDateString()}</div>
      </div>
      <div class="stamp">Authorized by Examination Board</div>
      <div class="footer">Generated by Examination App</div>
      <div class="print-hide" style="text-align:center; margin-top: 24px;">
        <button onclick="window.print()" style="padding: 8px 16px;">Print / Save as PDF</button>
      </div>
    </div>
  </body>
</html>`
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Exam Results</h1>
          <p className="text-muted-foreground">Your performance summary</p>
        </div>

        <Card className="p-6 md:p-12 mb-8 text-center space-y-6">
          <div>
            <div className={`text-4xl md:text-6xl font-bold ${isPassed ? "text-green-600" : "text-red-600"}`}>
              {result.percentage}%
            </div>
            <p className="text-xl md:text-2xl font-semibold mt-2">{isPassed ? "Passed!" : "Did Not Pass"}</p>
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

        {Array.isArray(result.answers) && result.answers.length > 0 && (
          <div className="space-y-4">
            {result.answers.map((a, idx) => {
              const correct = !!a.is_correct
              const statusText = correct ? "Correct" : "Wrong"
              const statusColor = correct ? "text-green-600" : "text-red-600"
              return (
                <Card key={`${a.questionId}-${idx}`} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold mb-2">{a.question_text}</div>
                      <div className="text-sm text-muted-foreground mb-4">Marks: {a.marks_awarded}/{a.marks}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Your answer</div>
                          <div className="text-sm">{a.student_answer ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Correct answer</div>
                          <div className="text-sm">{a.correct_answer ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${statusColor}`}>{statusText}</div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
          <Button variant="outline" className="w-full sm:w-auto gap-2 bg-transparent" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="w-full sm:w-auto gap-2 bg-transparent" onClick={() => window.print()}>
            <Download className="w-4 h-4" />
            Save as PDF
          </Button>
          <Button className="w-full sm:w-auto gap-2" onClick={openCertificate}>
            Generate Certificate
          </Button>
          <Link href="/student/dashboard" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
