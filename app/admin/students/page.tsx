"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-client"
import { Users, TrendingUp, Lock, Unlock } from "lucide-react"

interface AdminStudentSummary {
  id: string
  fullName: string
  email: string
  classLevel?: string
  studentId?: string
  lockedDashboard?: boolean
  lockedExams?: boolean
  totalExamsAttempted: number
  averageScore: number
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
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
    async function load() {
      setLoading(false)
      try {
        const res = await fetch("/api/admin/students", { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setStudents(Array.isArray(data) ? data : [])
        } else {
          setStudents([])
        }
      } catch (error) {
        console.error("Failed to load students:", error)
        setStudents([])
      }
    }
    load()
  }, [router, authLoading, user])

  async function updateLock(studentId: string, updates: { lockDashboard?: boolean; lockExams?: boolean }) {
    const token = localStorage.getItem("auth_token") || ""
    await fetch("/api/admin/lock/student", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ studentId, ...updates }),
    })
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              lockedDashboard: updates.lockDashboard ?? s.lockedDashboard,
              lockedExams: updates.lockExams ?? s.lockedExams,
            }
          : s,
      ),
    )
  }

  async function deleteStudent(studentId: string) {
    const token = localStorage.getItem("auth_token") || ""
    await fetch(`/api/admin/students/${studentId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    setStudents((prev) => prev.filter((s) => s.id !== studentId))
  }

  async function editStudent(studentId: string) {
    const token = localStorage.getItem("auth_token") || ""
    const fullName = window.prompt("Enter new full name (leave blank to skip)") || undefined
    const classLevel = window.prompt("Enter class level (B7/B8, leave blank to skip)") || undefined
    const payload: any = {}
    if (fullName && fullName.trim()) payload.fullName = fullName.trim()
    if (classLevel && classLevel.trim()) payload.classLevel = classLevel.trim()
    if (Object.keys(payload).length === 0) return
    await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...payload } : s)))
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Manage Students
              </h1>
              <p className="text-slate-400 mt-1">View and manage all registered students</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
              <p className="text-slate-400 text-sm">Total Students</p>
              <p className="text-3xl font-bold text-blue-300 mt-2">{students.length}</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
              <p className="text-slate-400 text-sm">Avg Performance</p>
              <p className="text-3xl font-bold text-green-300 mt-2">
                {students.length > 0
                  ? Math.round(students.reduce((acc, s) => acc + s.averageScore, 0) / students.length)
                  : 0}
                %
              </p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
              <p className="text-slate-400 text-sm">Total Attempts</p>
              <p className="text-3xl font-bold text-orange-300 mt-2">
                {students.reduce((acc, s) => acc + s.totalExamsAttempted, 0)}
              </p>
            </Card>
          </div>
        </div>

        {students.length === 0 ? (
          <Card className="p-12 text-center bg-slate-800/50 border border-blue-500/20 backdrop-blur">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No students found.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {students.map((s, idx) => (
              <Card
                key={s.id}
                className="p-6 bg-gradient-to-r from-slate-800/50 to-blue-900/20 border border-blue-500/20 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 transform hover:scale-[1.02]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                        {s.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-100">{s.fullName}</div>
                        <div className="text-sm text-slate-400">{s.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {s.classLevel && (
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">{s.classLevel}</Badge>
                      )}
                      <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {s.totalExamsAttempted} attempts
                      </Badge>
                      <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                        {s.averageScore}% avg
                      </Badge>
                      {s.lockedDashboard && (
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                          <Lock className="w-3 h-3 mr-1" />
                          Dashboard Locked
                        </Badge>
                      )}
                      {s.lockedExams && (
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                          <Lock className="w-3 h-3 mr-1" />
                          Exams Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:flex-col">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateLock(s.id, { lockDashboard: !s.lockedDashboard })}
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-all duration-300"
                    >
                      {s.lockedDashboard ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Unlock Dashboard
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Lock Dashboard
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateLock(s.id, { lockExams: !s.lockedExams })}
                      className="border-orange-500/30 text-orange-300 hover:bg-orange-500/20 transition-all duration-300"
                    >
                      {s.lockedExams ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Unlock Exams
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Lock Exams
                        </>
                      )}
                    </Button>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editStudent(s.id)} className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteStudent(s.id)} className="border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-300">
                        Delete
                      </Button>
                    </div>
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
