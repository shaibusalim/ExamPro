"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Clipboard, Lock, Unlock } from "lucide-react"

interface ExamSummary {
  id: string
  title: string
  topic: string
  questionsCount: number
  locked: boolean
  status: string
  createdAt: string
}

export default function AdminManageExamsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    if (!authLoading && user && user.role !== "admin") {
      router.push("/login")
      return
    }

    async function loadExams() {
      try {
        const res = await fetch("/api/admin/exams", { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setExams(Array.isArray(data) ? data : [])
        } else {
          setExams([])
        }
      } finally {
        setLoading(false)
      }
    }
    loadExams()
  }, [router, authLoading, user])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  async function toggleLockExam(examId: string, lock: boolean) {
    const token = localStorage.getItem("auth_token") || ""
    await fetch("/api/admin/exams/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ examId, lock }),
    })
    setExams((prev) => prev.map((exam) => (exam.id === examId ? { ...exam, locked: lock } : exam)))
  }

  async function refetchExams() {
    const token = localStorage.getItem("auth_token") || ""
    const res = await fetch("/api/admin/exams", { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Manage Exams
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">View and manage all created exams with lock/unlock controls</p>
        </div>

        {exams.length === 0 ? (
          <Card className="p-12 text-center border-blue-900/20 bg-slate-900/50 backdrop-blur-sm">
            <Clipboard className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">No exams found. Create your first exam to get started.</p>
            <Button
              onClick={() => router.push("/admin/exams/create")}
              className="mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/30"
            >
              Create Exam
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="p-6 border-blue-900/20 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/60 hover:border-blue-500/30 transition-all duration-300 shadow-lg shadow-blue-950/10 animate-fade-in"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-cyan-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-100">{exam.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Topic: <span className="text-blue-400 font-medium">{exam.topic}</span> • Questions:{" "}
                          <span className="text-cyan-400 font-medium">{exam.questionsCount}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pl-5">
                      {exam.locked ? (
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          Unlocked
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs uppercase">{exam.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                  <Button
                    onClick={() => toggleLockExam(exam.id, !exam.locked)}
                    className={`transition-all duration-300 shadow-lg ${
                      exam.locked
                        ? "bg-green-600 hover:bg-green-500 shadow-green-500/30 text-white"
                        : "bg-red-600/50 hover:bg-red-600 shadow-red-500/30 text-white"
                    }`}
                  >
                    {exam.locked ? (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Lock
                      </>
                    )}
                  </Button>
                  {exam.status !== "published" && (
                    <Button
                      onClick={async () => {
                        const token = localStorage.getItem("auth_token") || ""
                        await fetch("/api/exams", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ examId: exam.id, status: "published" }),
                        })
                        setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, status: "published" } : e)))
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    onClick={async () => {
                      if (!window.confirm("Delete this exam? This cannot be undone.")) return
                      const token = localStorage.getItem("auth_token") || ""
                      const res = await fetch(`/api/admin/exams/${exam.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (res.ok) {
                        await refetchExams()
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
