"use client"

import { useEffect, useState } from "react"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

interface Attempt {
  examId: string
  examTitle: string
  score: number
  totalMarks: number
  percentage: number
  submittedAt: string | null
}
interface StudentScoreRow {
  id: string
  fullName: string
  email: string
  classLevel: string
  attempts: Attempt[]
}

export default function AdminScoresPage() {
  const [b7, setB7] = useState<StudentScoreRow[]>([])
  const [b8, setB8] = useState<StudentScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem("auth_token")
        const headers = { Authorization: `Bearer ${token}` }
        const [r7, r8] = await Promise.all([
          fetch(`/api/admin/scores?classLevel=B7`, { headers }),
          fetch(`/api/admin/scores?classLevel=B8`, { headers }),
        ])
        const d7 = r7.ok ? await r7.json() : []
        const d8 = r8.ok ? await r8.json() : []
        setB7(Array.isArray(d7) ? d7 : [])
        setB8(Array.isArray(d8) ? d8 : [])
      } catch {
        setB7([])
        setB8([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  function Section({ title, rows }: { title: string; rows: StudentScoreRow[] }) {
    return (
      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card className="p-8 text-center">No data</Card>
        ) : (
          <div className="space-y-4">
            {rows.map((s) => (
              <Card key={s.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">{s.fullName}</div>
                    <div className="text-sm text-muted-foreground">{s.email}</div>
                  </div>
                  <Badge>{s.classLevel}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {s.attempts.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No attempts</div>
                  ) : (
                    s.attempts.map((a, idx) => (
                      <div key={`${s.id}-${a.examId}-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border rounded p-3">
                        <div className="font-medium">{a.examTitle}</div>
                        <div className="text-sm">{a.score}/{a.totalMarks}</div>
                        <div className="text-sm">{a.percentage}%</div>
                        <div className="text-xs text-muted-foreground">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}
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
          <p className="text-muted-foreground">Monitor students' performance by class level</p>
        </div>

        <Tabs defaultValue="B7" className="space-y-6">
          <TabsList>
            <TabsTrigger value="B7">Basic 7</TabsTrigger>
            <TabsTrigger value="B8">Basic 8</TabsTrigger>
          </TabsList>
          <TabsContent value="B7">
            <Section title="Basic 7" rows={b7} />
          </TabsContent>
          <TabsContent value="B8">
            <Section title="Basic 8" rows={b8} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

