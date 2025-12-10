"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-client"
import { Users, TrendingUp, Lock, Unlock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface AdminStudentSummary {
  id: string
  fullName: string
  email: string
  classLevel?: string
  studentId?: string
  lockedDashboard?: boolean
  lockedExams?: boolean
  isApproved?: boolean
  totalExamsAttempted: number
  averageScore: number
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [currentStudent, setCurrentStudent] = useState<AdminStudentSummary | null>(null)
  const [editFullName, setEditFullName] = useState("")
  const [editClassLevel, setEditClassLevel] = useState("")
  const [pending, setPending] = useState(false)
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"B7" | "B8">("B7")

  async function reloadStudents() {
    const token = localStorage.getItem("auth_token") || ""
    const res = await fetch("/api/admin/students", { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    }
  }

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

  async function updateApproval(studentId: string, approved: boolean) {
    const token = localStorage.getItem("auth_token") || ""
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isApproved: approved }),
    })
    if (res.ok) {
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, isApproved: approved } : s)))
      toast({ title: approved ? "Student approved" : "Approval revoked" })
    } else {
      toast({ title: "Update failed", description: "Could not update approval.", variant: "destructive" as any })
    }
  }

  async function confirmDelete() {
    if (!currentStudent) return
    const token = localStorage.getItem("auth_token") || ""
    setPending(true)
    const res = await fetch(`/api/admin/students/${currentStudent.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    setPending(false)
    if (res.ok) {
      await reloadStudents()
      toast({ title: "Student deleted", description: `${currentStudent.fullName} has been removed.` })
    } else {
      const body = await res.json().catch(() => ({} as any))
      toast({ title: "Deletion failed", description: body?.error || "Could not delete student.", variant: "destructive" as any })
    }
    setDeleteOpen(false)
    setCurrentStudent(null)
  }

  async function submitEdit() {
    if (!currentStudent) return
    const token = localStorage.getItem("auth_token") || ""
    const payload: any = {}
    if (editFullName.trim()) payload.fullName = editFullName.trim()
    if (["B7", "B8"].includes(editClassLevel)) payload.classLevel = editClassLevel
    if (Object.keys(payload).length === 0) {
      setEditOpen(false)
      setCurrentStudent(null)
      return
    }
    setPending(true)
    const res = await fetch(`/api/admin/students/${currentStudent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    setPending(false)
    if (res.ok) {
      setStudents((prev) => prev.map((s) => (s.id === currentStudent.id ? { ...s, ...payload } : s)))
      toast({ title: "Student updated", description: "Changes saved successfully." })
    } else {
      toast({ title: "Update failed", description: "Could not update student.", variant: "destructive" as any })
    }
    setEditOpen(false)
    setCurrentStudent(null)
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search" className="text-slate-300">Search students</Label>
                <Input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or ID" className="mt-2 bg-slate-900/50 border-blue-500/20 text-slate-100 placeholder-slate-500" />
              </div>
            </div>

            {(() => {
              const q = query.trim().toLowerCase()
              const filtered = students.filter((s) => {
                const name = String(s.fullName || "").toLowerCase()
                const email = String(s.email || "").toLowerCase()
                const sid = String(s.studentId || s.id || "").toLowerCase()
                return !q || name.includes(q) || email.includes(q) || sid.includes(q)
              })
              const b7 = filtered.filter((s) => String(s.classLevel || "") === "B7")
              const b8 = filtered.filter((s) => String(s.classLevel || "") === "B8")

              const renderList = (list: AdminStudentSummary[]) => (
                <div className="grid gap-4">
                  {list.map((s, idx) => (
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
                            <Badge className={s.isApproved ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"}>
                              {s.isApproved ? "Approved" : "Pending Approval"}
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
                            onClick={() => updateApproval(s.id, !s.isApproved)}
                            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all duration-300"
                          >
                            {s.isApproved ? "Revoke Approval" : "Approve"}
                          </Button>
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
                            <Button size="sm" variant="outline" onClick={() => { setCurrentStudent(s); setEditFullName(s.fullName || ""); setEditClassLevel(s.classLevel || ""); setEditOpen(true) }} className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300">
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setCurrentStudent(s); setDeleteOpen(true) }} className="border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all duration-300">
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )

              return (
                <Tabs value={tab} onValueChange={(v) => setTab(v as "B7" | "B8") } className="space-y-6">
                  <TabsList className="bg-slate-800/50 border border-blue-500/20">
                    <TabsTrigger value="B7" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">Basic 7</TabsTrigger>
                    <TabsTrigger value="B8" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">Basic 8</TabsTrigger>
                  </TabsList>
                  <TabsContent value="B7">
                    {b7.length === 0 ? (
                      <Card className="p-6 bg-slate-800/50 border border-blue-500/20"><p className="text-slate-400">No students</p></Card>
                    ) : renderList(b7)}
                  </TabsContent>
                  <TabsContent value="B8">
                    {b8.length === 0 ? (
                      <Card className="p-6 bg-slate-800/50 border border-blue-500/20"><p className="text-slate-400">No students</p></Card>
                    ) : renderList(b8)}
                  </TabsContent>
                </Tabs>
              )
            })()}
          </div>
        )}
        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update the student's details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classLevel">Class Level (B7/B8)</Label>
                <Input id="classLevel" value={editClassLevel} onChange={(e) => setEditClassLevel(e.target.value.toUpperCase())} placeholder="B7 or B8" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); setCurrentStudent(null) }} disabled={pending}>Cancel</Button>
              <Button onClick={submitEdit} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={pending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Student</DialogTitle>
              <DialogDescription>This action will remove the student account. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeleteOpen(false); setCurrentStudent(null) }} disabled={pending}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={pending}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
