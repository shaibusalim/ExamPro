"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-client"

interface Attempt {
  examId: string
  examTitle: string
  score: number
  totalMarks: number
  percentage: number
  submittedAt: string | null
  id?: string
  studentId?: string
  status?: string
  answers?: Record<string, any>
}
interface StudentScoreRow {
  id: string
  fullName: string
  email: string
  classLevel: string
  attempts: Attempt[]
}

export default function AdminScoresPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [attempts, setAttempts] = useState<any[]>([])
  const [studentsMap, setStudentsMap] = useState<Record<string, { fullName: string; email?: string; classLevel?: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [ra, rs] = await Promise.all([
          fetch(`/api/admin/scores`, { headers }),
          fetch(`/api/admin/students`, { headers }),
        ])
        const da = ra.ok ? await ra.json() : []
        const ds = rs.ok ? await rs.json() : []
        const map: Record<string, { fullName: string; email?: string; classLevel?: string }> = {}
        if (Array.isArray(ds)) {
          for (const s of ds) {
            map[String(s.id)] = { fullName: String(s.fullName || ""), email: String(s.email || ""), classLevel: String(s.classLevel || "") }
          }
        }
        const onlySubmitted = Array.isArray(da)
          ? da.filter((a: any) => String(a.status || "") !== "in_progress")
          : []
        // Sort pending_review first, then published by submittedAt desc
        onlySubmitted.sort((a: any, b: any) => {
          const sa = String(a.status || "")
          const sb = String(b.status || "")
          if (sa === "pending_review" && sb !== "pending_review") return -1
          if (sb === "pending_review" && sa !== "pending_review") return 1
          const at = a.submittedAt?.toDate?.() ? a.submittedAt.toDate().getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
          const bt = b.submittedAt?.toDate?.() ? b.submittedAt.toDate().getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0)
          return bt - at
        })
        setStudentsMap(map)
        setAttempts(onlySubmitted)
      } catch {
        setAttempts([])
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      if (!user || user.role !== "admin") {
        router.push("/login")
        setLoading(false)
        return
      }
      load()
    }
  }, [router, authLoading, user])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function publishAttempt(attemptId: string) {
    const token = localStorage.getItem("auth_token")
    if (!token) return
    try {
      const res = await fetch(`/api/admin/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ attemptId }),
      })
      if (!res.ok) {
        try {
          const body = await res.json()
          alert(String(body?.error || "Failed to publish result"))
        } catch {
          alert("Failed to publish result")
        }
        return
      }
      // refresh lists
      window.location.reload()
    } catch (e) {
      alert("Network error while publishing")
    }
  }

  function ReviewPanel({ attempt }: { attempt: any }) {
    const [loading, setLoading] = useState(false)
    const [answers, setAnswers] = useState<Record<string, any>>(attempt.answers || {})
    const [questionTexts, setQuestionTexts] = useState<Record<string, string>>({})
    const [error, setError] = useState("")
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : ""

    useEffect(() => {
      async function loadQuestions() {
        if (!token) return
        const qids = Object.keys(answers)
        const map: Record<string, string> = {}
        for (const qid of qids) {
          try {
            const res = await fetch(`/api/admin/questions/${qid}`, { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) {
              const data = await res.json()
              map[qid] = String(data.questionText || data.question || data.question_text || "")
            } else {
              map[qid] = ""
            }
          } catch {
            map[qid] = ""
          }
        }
        setQuestionTexts(map)
      }
      loadQuestions()
    }, [])

    function updateMark(qid: string, val: number) {
      const a = answers[qid]
      const qm = Number(a?.questionMarks ?? 0)
      const clamped = Math.max(0, Math.min(qm, isNaN(val) ? 0 : val))
      setAnswers({ ...answers, [qid]: { ...a, marksAwarded: clamped } })
    }

    async function saveAdjustments() {
      if (!token) return
      setLoading(true)
      setError("")
      try {
        const adjustments = Object.keys(answers).map((qid) => ({
          questionId: qid,
          marksAwarded: Number(answers[qid]?.marksAwarded ?? 0),
        }))
        const res = await fetch(`/api/admin/scores`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ attemptId: attempt.id, adjustments }),
        })
        if (!res.ok) {
          try {
            const body = await res.json()
            setError(String(body?.error || "Failed to save adjustments"))
          } catch {
            setError("Failed to save adjustments")
          }
          return
        }
        window.location.reload()
      } catch {
        setError("Network error while saving")
      } finally {
        setLoading(false)
      }
    }

    const entries = Object.entries(answers)
    return (
      <Card className="p-4 mt-3 space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No answers</div>
        ) : (
          entries.map(([qid, ans]) => {
            const qm = Number(ans?.questionMarks ?? 0)
            const awarded = Number(ans?.marksAwarded ?? 0)
            const text = String(questionTexts[qid] || "")
            const isEssay = qm > 2 // heuristic: essay is usually 6
            return (
              <div key={qid} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                <div className="col-span-2">
                  <div className="text-sm font-medium">Q: {text || qid}</div>
                  <div className="text-xs text-muted-foreground">Student: {String(ans?.studentAnswer ?? "—")}</div>
                </div>
                <div className="text-sm">Marks: {awarded}/{qm}</div>
                <div>
                  {isEssay ? (
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-sm w-24"
                      min={0}
                      max={qm}
                      value={awarded}
                      onChange={(e) => updateMark(qid, Number(e.target.value))}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Objective</span>
                  )}
                </div>
                <div className="text-right">
                  <button
                    className="text-xs px-2 py-1 border rounded"
                    onClick={() => updateMark(qid, qm)}
                  >
                    Full
                  </button>
                </div>
              </div>
            )
          })
        )}
        <div className="text-right">
          <button
            className="text-xs px-3 py-2 border rounded"
            disabled={loading}
            onClick={saveAdjustments}
          >
            {loading ? "Saving..." : "Save Adjustments"}
          </button>
        </div>
      </Card>
    )
  }

  function Section({ title, rows }: { title: string; rows: any[] }) {
    return (
      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card className="p-8 text-center">No data</Card>
        ) : (
          <div className="space-y-4">
            {rows.map((a: any) => {
                const submittedAtStr =
                  typeof a.submittedAt === "string"
                    ? a.submittedAt
                    : (a.submittedAt?.toDate?.()?.toISOString?.() || "")
                const stu = studentsMap[String(a.studentId || "")] || { fullName: "", email: "", classLevel: "" }
                return (
                  <Card key={a.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{stu.fullName || "Unknown Student"}</div>
                        <div className="text-sm text-muted-foreground">{stu.email || ""}</div>
                      </div>
                      <Badge>{String(a.status || "in_progress")}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-center border rounded p-3">
                      <div className="font-medium">{a.examId || "—"}</div>
                      <div className="text-sm">{Number(a.score ?? 0)}/{Number(a.totalMarks ?? 0)}</div>
                      <div className="text-sm">{Number(a.percentage ?? 0)}%</div>
                      <div className="text-xs text-muted-foreground">{submittedAtStr ? new Date(submittedAtStr).toLocaleString() : "—"}</div>
                      <div className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="text-xs px-2 py-1 border rounded"
                            onClick={() => publishAttempt(a.id)}
                            disabled={String(a.status || "") === "published"}
                          >
                            Publish
                          </button>
                          <button
                            className="text-xs px-2 py-1 border rounded"
                            onClick={() => {
                              const el = document.getElementById(`review-${a.id}`)
                              if (el) el.classList.toggle("hidden")
                            }}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                    <div id={`review-${a.id}`} className="hidden">
                      <ReviewPanel attempt={{ id: a.id, answers: a.answers || {} }} />
                    </div>
                  </Card>
                )
              
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Scores</h1>
          <p className="text-muted-foreground">Review and publish submitted exam results</p>
        </div>

        <Section title="Submitted Attempts" rows={attempts} />
      </main>
    </div>
  )
}
